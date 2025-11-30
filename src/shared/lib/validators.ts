import { z } from 'zod';

export const emailSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(50),
  subject: z.string().min(1).max(200),
});

export const uploadSchema = z.object({
  files: z.array(z.any()).min(1).max(10),
});

export const checkoutSchema = z.object({
  product_id: z.string().min(1),
  currency: z.string().optional(),
  locale: z.string().optional(),
  payment_provider: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  quantity: z.number().int().min(1).max(100).optional(),
});
