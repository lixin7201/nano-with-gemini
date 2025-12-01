import { eq, and, or } from 'drizzle-orm';

import { envConfigs } from '@/config';
import { credit } from '@/config/db/schema';
import { db } from '@/core/db';
import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import { getSnowId, getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { createAITask, NewAITask, updateAITaskById } from '@/shared/models/ai_task';
import {
  consumeCredits,
  createCredit,
  CreditStatus,
  CreditTransactionScene,
  CreditTransactionType,
  getRemainingCredits,
  isAdminFreeCredits,
  NewCredit,
} from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';

export async function POST(request: Request) {
  try {
    let { provider, mediaType, model, prompt, options, scene, resolution, aspectRatio } =
      await request.json();

    if (!provider || !mediaType || !model) {
      throw new Error('invalid params');
    }

    if (!prompt && !options) {
      throw new Error('prompt or options is required');
    }

    const aiService = await getAIService();

    // check generate type
    if (!aiService.getMediaTypes().includes(mediaType)) {
      throw new Error('invalid mediaType');
    }

    // check ai provider
    const aiProvider = aiService.getProvider(provider);
    if (!aiProvider) {
      throw new Error('invalid provider');
    }

    // get current user
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // Validate mediaType and scene combinations regardless of admin status
    if (mediaType === AIMediaType.IMAGE) {
      if (scene !== 'image-to-image' && scene !== 'text-to-image') {
        throw new Error('invalid scene for image media type');
      }
    } else if (mediaType === AIMediaType.MUSIC) {
      // Assuming 'text-to-music' is the only valid scene for MUSIC currently.
      if (scene !== 'text-to-music') {
        throw new Error('invalid scene for music media type');
      }
    } else {
      throw new Error('invalid mediaType or unsupported media type');
    }

    let costCredits = 0; // Initialize cost for everyone
    const isUnlimited = await isAdminFreeCredits(user.id);

    // Default resolution to 2k if not provided
    const targetResolution = resolution || '2k';

    // Temporarily disable 4K feature
    if (targetResolution === '4k') {
      return new Response(
        JSON.stringify({
          code: 'FEATURE_DISABLED',
          message: '4K output is temporarily unavailable. Please use 1K or 2K.',
        }),
        { status: 400 }
      );
    }

    if (!isUnlimited) {
      // Calculate cost credits for non-admin users
      if (mediaType === AIMediaType.IMAGE) {
        // Check resolution for cost (applies to both text-to-image and image-to-image for Gemini)
        if (targetResolution === '4k') {
          costCredits = 20;
          // Check 4K permission: must have active subscription (not just free trial)
          const hasPurchase = await db()
            .select()
            .from(credit)
            .where(
              and(
                eq(credit.userId, user.id),
                eq(credit.transactionType, CreditTransactionType.GRANT),
                or(
                  eq(credit.transactionScene, CreditTransactionScene.PAYMENT),
                  eq(credit.transactionScene, CreditTransactionScene.SUBSCRIPTION),
                  eq(credit.transactionScene, CreditTransactionScene.RENEWAL)
                )
              )
            )
            .limit(1);

          if (hasPurchase.length === 0) {
             return new Response(
               JSON.stringify({
                 code: 'NO_4K_PERMISSION',
                 message: '4K 仅对付费订阅用户开放',
               }),
               { status: 403 } // 403 Forbidden
             );
          }

        } else {
          // 1k/2k
          costCredits = 10;
        }
      } else if (mediaType === AIMediaType.MUSIC) {
        costCredits = 10;
      }

      // Check credits for non-admin users
      const remainingCredits = await getRemainingCredits(user.id);
      if (remainingCredits < costCredits) {
        return new Response(
          JSON.stringify({
            code: 'INSUFFICIENT_CREDITS',
            message: '积分不足，请前往订阅',
          }),
          { status: 402 } // 402 Payment Required
        );
      }
      
      // Consume credits before generation
      await consumeCredits({
        userId: user.id,
        credits: costCredits,
        scene: mediaType === AIMediaType.IMAGE ? `image_generation_${targetResolution}` : 'music_generation',
        description: `Generate ${mediaType} (${targetResolution || ''})`,
      });
    }

    const callbackUrl = `${envConfigs.app_url}/api/ai/notify/${provider}`;

    const params: any = {
      mediaType,
      model,
      prompt,
      callbackUrl,
      options: {
        ...options,
        resolution: targetResolution,
        aspectRatio,
      },
    };

    // Step 1: 立即创建 PENDING 任务并返回
    const taskId = getUuid(); // 生成一个唯一的任务 ID
    const initialTaskStatus = AITaskStatus.PENDING;

    const newAITask: NewAITask = {
      id: taskId,
      userId: user.id,
      mediaType,
      provider,
      model,
      prompt,
      scene,
      options: options ? JSON.stringify({ ...options, resolution: targetResolution, aspectRatio }) : JSON.stringify({ resolution: targetResolution, aspectRatio }),
      status: initialTaskStatus,
      costCredits,
      taskId: taskId, // 使用相同的 ID 作为 provider task id
      taskInfo: null,
      taskResult: null,
    };

    await createAITask(newAITask);

    // Step 2: 立即返回任务给前端（不等待 Gemini 完成）
    const response = respData(newAITask);

    // Step 3: 移除后台异步调用，改为在 query 接口中触发 (Long Polling)
    // Promise.resolve().then(async () => { ... })

    // 立即返回响应
    return response;
  } catch (e: any) {
    console.log('generate failed', e);
    return respErr(e.message);
  }
}
