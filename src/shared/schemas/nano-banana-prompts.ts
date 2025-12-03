import { z } from 'zod';

/**
 * i18n 内容 Schema
 */
export const I18nContentSchema = z.object({
  title: z.string(),
  prompt: z.string().min(1),
  description: z.string().optional(),
});

/**
 * Source 来源 Schema
 */
export const SourceSchema = z.object({
  repo: z.string(),
  author: z.string().optional(),
  sourceUrl: z.string().optional(),
  publishedAt: z.string().optional(),
});

/**
 * 单条 NanoBananaPrompt Schema
 */
export const NanoBananaPromptSchema = z.object({
  id: z.string().min(1),
  images: z.array(z.string().url()).min(1),
  i18n: z.record(z.string(), I18nContentSchema),
  source: SourceSchema.optional(),
  isFeatured: z.boolean().optional(),
});

/**
 * NanoBananaPrompts 数组 Schema
 */
export const NanoBananaPromptsSchema = z.array(NanoBananaPromptSchema);

/**
 * Meta 元数据 Schema
 */
export const NanoBananaMetaSchema = z.object({
  schemaVersion: z.number(),
  upstream: z.object({
    repo: z.string(),
    commit: z.string(),
    syncedAt: z.string(),
  }),
  stats: z.object({
    items: z.number(),
    images: z.number(),
  }),
});

/**
 * 类型导出
 */
export type I18nContent = z.infer<typeof I18nContentSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type NanoBananaPrompt = z.infer<typeof NanoBananaPromptSchema>;
export type NanoBananaMeta = z.infer<typeof NanoBananaMetaSchema>;
