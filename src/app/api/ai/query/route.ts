import { respData, respErr } from '@/shared/lib/resp';
import {
  findAITaskById,
  UpdateAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';
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
