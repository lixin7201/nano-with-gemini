import { envConfigs } from '@/config';
import { AITaskStatus } from '@/extensions/ai';
import { getSnowId, getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import {
  findAITaskById,
  UpdateAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';
import {
  createCredit,
  CreditStatus,
  CreditTransactionType,
  isAdminFreeCredits,
  NewCredit,
} from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';

export async function POST(req: Request) {
  try {
    const { taskId } = await req.json();
    if (!taskId) {
      return respErr('invalid params');
    }

    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const task = await findAITaskById(taskId);
    if (!task || !task.taskId) {
      return respErr('task not found');
    }

    if (task.userId !== user.id) {
      return respErr('no permission');
    }

    const aiService = await getAIService();
    const aiProvider = aiService.getProvider(task.provider);
    if (!aiProvider) {
      return respErr('invalid ai provider');
    }

    // Check if provider has query method (e.g., Replicate)
    // For providers without query (e.g., Gemini), return database state directly
    // Check if provider has query method (e.g., Replicate)
    // For providers without query (e.g., Gemini), return database state directly
    if (aiProvider.query && typeof aiProvider.query === 'function') {
      // Provider has query method - fetch latest status
      const result = await aiProvider.query({
        taskId: task.taskId,
      });

      if (!result?.taskStatus) {
        return respErr('query ai task failed');
      }

      // update ai task
      const updateAITask: UpdateAITask = {
        status: result.taskStatus,
        taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
        taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
        creditId: task.creditId, // credit consumption record id
      };
      if (updateAITask.taskInfo !== task.taskInfo) {
        await updateAITaskById(task.id, updateAITask);
      }

      task.status = updateAITask.status || '';
      task.taskInfo = updateAITask.taskInfo || null;
      task.taskResult = updateAITask.taskResult || null;
    } else if (task.status === AITaskStatus.PENDING) {
      // Scheme A: Long Polling for Vercel Serverless
      // If task is PENDING, it means it was created by /generate but not started (or failed to start background task)
      // We pick it up here and execute it synchronously (Long Polling)

      console.log(`[Query Task ${taskId}] picking up PENDING task...`);

      // 1. Mark as PROCESSING to prevent other requests from picking it up
      await updateAITaskById(task.id, { status: AITaskStatus.PROCESSING });
      task.status = AITaskStatus.PROCESSING; // Update local object

      try {
        // 2. Reconstruct params
        const options = task.options ? JSON.parse(task.options) : {};
        const callbackUrl = `${envConfigs.app_url}/api/ai/notify/${task.provider}`;

        const params: any = {
          mediaType: task.mediaType,
          model: task.model,
          prompt: task.prompt,
          callbackUrl,
          options: options,
        };

        console.log(`[Query Task ${taskId}] Starting generation (Long Polling)...`);

        // 3. Execute Generation (Await it!)
        // This will block the request for 20-60s
        const result = await aiProvider.generate({ params });

        console.log(`[Query Task ${taskId}] Generation completed`);

        if (!result?.taskId) {
          throw new Error('Provider did not return a valid taskId');
        }

        // 4. Update to SUCCESS
        const updateData: UpdateAITask = {
          status: result.taskStatus,
          taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
          taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
        };

        await updateAITaskById(task.id, updateData);

        // Update local object to return immediately
        task.status = updateData.status || '';
        task.taskInfo = updateData.taskInfo || null;
        task.taskResult = updateData.taskResult || null;

      } catch (error: any) {
        console.error(`[Query Task ${taskId}] Failed:`, error.message);

        // 5. Handle Failure & Refund
        await updateAITaskById(task.id, {
          status: AITaskStatus.FAILED,
          taskInfo: JSON.stringify({
            errorMessage: error.message,
            errorCode: 'GENERATION_FAILED',
          }),
        });

        task.status = AITaskStatus.FAILED;
        task.taskInfo = JSON.stringify({ errorMessage: error.message });

        // Refund logic
        const isUnlimited = await isAdminFreeCredits(user.id);
        const costCredits = task.costCredits || 0;

        if (!isUnlimited && costCredits > 0) {
           // Check if already refunded to be safe (though transaction logic should handle it, we do it simply here)
           // Actually, we just create a new refund record.
           const newCredit: NewCredit = {
            id: getUuid(),
            transactionNo: getSnowId(),
            transactionType: CreditTransactionType.GRANT,
            transactionScene: 'generation_failed_refund',
            userId: user.id,
            status: CreditStatus.ACTIVE,
            description: 'Refund for failed generation (Query)',
            credits: costCredits,
            remainingCredits: costCredits,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          };
          await createCredit(newCredit);
          console.log(`[Query Task ${taskId}] Credits refunded`);
        }
      }
    }
    // For providers without query method (e.g., Gemini with async background updates)
    // Return the current database state as-is
    // The background task in /api/ai/generate will update the status

    return respData(task);
  } catch (e: any) {
    console.log('ai query failed', e);
    return respErr(e.message);
  }
}
