import rawData from '@/data/nano-banana-prompts.json';
import { ShowcaseItem } from '@/shared/types/blocks/landing';
import { normalizeLocale } from '@/shared/lib/locale';

// v2.1: Banned 关键词可配置
const defaultBanned = ['google', 'gemini', 'gpt', 'chatgpt', 'openai'];
const envBanned = process.env.NB_BANNED_KEYWORDS
  ?.split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);
const banned = (envBanned?.length ? envBanned : defaultBanned);

// v2.1: 可复现的种子洗牌
function seededShuffle<T>(arr: T[], seed: number) {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    // 简单 LCG 生成 [0,1)
    s = (1664525 * s + 1013904223) >>> 0;
    const r = s / 0xffffffff;
    const j = Math.floor(r * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface RawItem {
  id: string;
  images: string[];
  i18n: {
    [locale: string]: {
      title: string;
      prompt: string;
      description?: string;
    };
  };
  source: {
    repo: string;
    author?: string;
    sourceUrl?: string;
    publishedAt?: string;
  };
  isFeatured?: boolean;
}

/**
 * v2.4: 支持 options 参数
 * - filter: 是否过滤 banned 关键词（默认 true）
 * - seed: 自定义随机种子
 */
export interface GetNanoBananaOptions {
  filter?: boolean;
  seed?: number;
}

export function getNanoBananaShowcaseItems(
  limit?: number,
  locale: string = 'zh',
  options?: GetNanoBananaOptions
): ShowcaseItem[] {
  const normalizedLocale = normalizeLocale(locale);
  const shouldFilter = options?.filter !== false;

  let items = (rawData as RawItem[])
    .map((item) => {
      // 多语言回退：指定语言 → en → 任意可用
      const content =
        item.i18n[normalizedLocale] ??
        item.i18n['en'] ??
        Object.values(item.i18n)[0];

      if (!content) return null;

      const { title, prompt } = content;
      const imageSrc = item.images?.[0];
      if (!prompt || !imageSrc) return null;

      // Banned 过滤（单点职责，v2.4: 可通过 options.filter=false 禁用）
      if (shouldFilter) {
        const hay = `${title ?? ''} ${prompt}`.toLowerCase();
        if (banned.some((k) => hay.includes(k))) return null;
      }

      const finalTitle = title || prompt.slice(0, 24) + '...';

      return {
        title: finalTitle,
        prompt: prompt,
        image: { src: imageSrc, alt: finalTitle },
      } as ShowcaseItem;
    })
    .filter((item): item is ShowcaseItem => item !== null);

  // v2.1: 使用种子洗牌
  // SSR 页与客户端建议共用同一 seed，避免水合不一致。
  // 这里使用按天生成的种子，或者环境变量，或者传入的 seed
  const seed = options?.seed ?? (Number(process.env.SHUFFLE_SEED) || Number(new Date().toISOString().slice(0, 10).replace(/-/g, '')));
  items = seededShuffle(items, seed);

  return limit && limit > 0 ? items.slice(0, limit) : items;
}
