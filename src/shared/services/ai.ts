import { AIManager, GeminiProvider, KieProvider, ReplicateProvider } from '@/extensions/ai';
import { Configs, getAllConfigs } from '@/shared/models/config';

/**
 * get ai manager with configs
 */
export function getAIManagerWithConfigs(configs: Configs) {
  const aiManager = new AIManager();

  if (configs.kie_api_key) {
    aiManager.addProvider(
      new KieProvider({
        apiKey: configs.kie_api_key,
      })
    );
  }

  if (configs.replicate_api_token) {
    aiManager.addProvider(
      new ReplicateProvider({
        apiToken: configs.replicate_api_token,
      })
    );
  }

  if (configs.gemini_api_key) {
    aiManager.addProvider(
      new GeminiProvider({
        apiKey: configs.gemini_api_key,
      })
    );
  }

  return aiManager;
}

/**
 * global ai service
 */
const globalForServices = globalThis as typeof globalThis & {
  __aiService?: AIManager;
};

/**
 * get ai service manager
 */
export async function getAIService(): Promise<AIManager> {
  if (globalForServices.__aiService) {
    return globalForServices.__aiService;
  }

  const configs = await getAllConfigs();
  const aiService = getAIManagerWithConfigs(configs);

  globalForServices.__aiService = aiService;
  return aiService;
}
