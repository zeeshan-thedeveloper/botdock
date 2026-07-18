import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('botdock-api'),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const createBotSchema = z.object({
  organisationId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
});

export type CreateBotInput = z.infer<typeof createBotSchema>;
