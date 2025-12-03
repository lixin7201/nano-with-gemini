/**
 * Locale 规范化映射表
 * 将各种别名统一为项目标准 locale
 */
const LOCALE_ALIASES: Record<string, string> = {
  // 英语
  'en': 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'en-AU': 'en',

  // 简体中文
  'zh': 'zh',
  'zh-CN': 'zh',
  'zh-Hans': 'zh',
  'zh-SG': 'zh',

  // 繁体中文
  'zh-TW': 'zh-TW',
  'zh-HK': 'zh-TW',
  'zh-Hant': 'zh-TW',

  // 日语
  'ja': 'ja',
  'ja-JP': 'ja',

  // 韩语
  'ko': 'ko',
  'ko-KR': 'ko',

  // 德语
  'de': 'de',
  'de-DE': 'de',
  'de-AT': 'de',
  'de-CH': 'de',

  // 法语
  'fr': 'fr',
  'fr-FR': 'fr',
  'fr-CA': 'fr',

  // 西班牙语（欧洲）
  'es': 'es',
  'es-ES': 'es',

  // 西班牙语（拉美）
  'es-419': 'es-419',
  'es-MX': 'es-419',
  'es-AR': 'es-419',

  // 葡萄牙语（巴西）
  'pt-BR': 'pt-BR',

  // 葡萄牙语（欧洲）
  'pt': 'pt',
  'pt-PT': 'pt',

  // 意大利语
  'it': 'it',
  'it-IT': 'it',

  // 泰语
  'th': 'th',
  'th-TH': 'th',

  // 越南语
  'vi': 'vi',
  'vi-VN': 'vi',

  // 印地语
  'hi': 'hi',
  'hi-IN': 'hi',

  // 土耳其语
  'tr': 'tr',
  'tr-TR': 'tr',
};

/**
 * 规范化 locale 到项目标准格式
 */
export function normalizeLocale(locale: string): string {
  return LOCALE_ALIASES[locale] ?? LOCALE_ALIASES[locale.split('-')[0]] ?? 'en';
}

/**
 * 支持的全部语言列表（16 种）
 */
export const SUPPORTED_LOCALES = [
  'en', 'zh', 'zh-TW', 'ja', 'ko', 'de', 'fr',
  'es', 'es-419', 'pt-BR', 'pt', 'it', 'th', 'vi', 'hi', 'tr'
] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number];
