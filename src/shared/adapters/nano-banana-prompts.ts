import rawData from '@/data/nano-banana-prompts.json';
import { ShowcaseItem } from '@/shared/types/blocks/landing';

// Define a flexible type for the raw JSON items to handle various field names
type RawItem = {
  prompt?: string;
  title?: string;
  // Possible image fields
  images?: string[];
  image?: string | { src: string };
  image_url?: string;
  url?: string;
  img?: string;
  [key: string]: any;
};

export function getNanoBananaShowcaseItems(limit?: number): ShowcaseItem[] {
  // Basic banned keywords for compliance filtering
  const banned = ['google', 'gemini', 'gpt', 'chatgpt', 'openai'];

  const items = (rawData as RawItem[])
    .map((item) => {
      const prompt = item.prompt;

      // Resolve image source from various possible fields
      let imageSrc = '';
      if (Array.isArray(item.images) && item.images.length > 0) imageSrc = item.images[0];
      else if (typeof item.image === 'string') imageSrc = item.image;
      else if (typeof item.image === 'object' && item.image?.src) imageSrc = item.image.src;
      else if (item.image_url) imageSrc = item.image_url;
      else if (item.url) imageSrc = item.url;
      else if (item.img) imageSrc = item.img;

      // Filter out invalid items
      if (!prompt || !imageSrc) return null;

      // Derive title if missing
      let title = item.title;
      if (!title && prompt) {
        title = prompt.slice(0, 24) + (prompt.length > 24 ? '...' : '');
      }

      // Compliance filter: drop items containing banned keywords
      const hay = `${title ?? ''} ${prompt ?? ''}`.toLowerCase();
      if (banned.some((k) => hay.includes(k))) return null;

      return {
        title: title || 'Showcase',
        prompt: prompt,
        image: {
          src: imageSrc,
          alt: title || 'Showcase image',
        },
      } as ShowcaseItem;
    })
    .filter((item) => item !== null) as ShowcaseItem[];

  // Randomize order
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  if (limit && limit > 0) {
    return items.slice(0, limit);
  }

  return items;
}
