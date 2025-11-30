import { AdsenseProvider, AdsManager } from '@/extensions/ads';
import { Configs, getAllConfigs } from '@/shared/models/config';

/**
 * get ads manager with configs
 */
export function getAdsManagerWithConfigs(configs: Configs) {
  const ads = new AdsManager();

  // adsense
  if (configs.adsense_code) {
    ads.addProvider(new AdsenseProvider({ adId: configs.adsense_code }));
  }

  return ads;
}

/**
 * global ads service
 */
const globalForServices = globalThis as typeof globalThis & {
  __adsService?: AdsManager;
};

/**
 * get ads service instance
 */
export async function getAdsService(): Promise<AdsManager> {
  if (globalForServices.__adsService) {
    return globalForServices.__adsService;
  }

  const configs = await getAllConfigs();
  const adsService = getAdsManagerWithConfigs(configs);

  globalForServices.__adsService = adsService;
  return adsService;
}
