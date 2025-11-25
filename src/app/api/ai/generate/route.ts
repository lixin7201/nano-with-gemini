import { envConfigs } from '@/config';
import { AIMediaType } from '@/extensions/ai';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { createAITask, NewAITask } from '@/shared/models/ai_task';
import {
  getRemainingCredits,
  isAdminFreeCredits,
} from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';

export async function POST(request: Request) {
  try {
    let { provider, mediaType, model, prompt, options, scene } =
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

    if (!isUnlimited) {
      // Calculate cost credits for non-admin users
      // todo: get cost credits from settings (for non-admins)
      if (mediaType === AIMediaType.IMAGE) {
        if (scene === 'image-to-image') {
          costCredits = 4;
        } else if (scene === 'text-to-image') {
          costCredits = 2;
        }
      } else if (mediaType === AIMediaType.MUSIC) {
        costCredits = 10;
      }

      // Check credits for non-admin users
      const remainingCredits = await getRemainingCredits(user.id);
      if (remainingCredits < costCredits) {
        throw new Error('insufficient credits');
      }
    }

    const callbackUrl = `${envConfigs.app_url}/api/ai/notify/${provider}`;

    const params: any = {
      mediaType,
      model,
      prompt,
      callbackUrl,
      options,
    };

    // generate content
    const result = await aiProvider.generate({ params });
    if (!result?.taskId) {
      throw new Error(
        `ai generate failed, mediaType: ${mediaType}, provider: ${provider}, model: ${model}`
      );
    }

    // create ai task
    const newAITask: NewAITask = {
      id: getUuid(),
      userId: user.id,
      mediaType,
      provider,
      model,
      prompt,
      scene,
      options: options ? JSON.stringify(options) : null,
      status: result.taskStatus,
      costCredits,
      taskId: result.taskId,
      taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
      taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
    };
    await createAITask(newAITask);

    return respData(newAITask);
  } catch (e: any) {
    console.log('generate failed', e);
    return respErr(e.message);
  }
}
