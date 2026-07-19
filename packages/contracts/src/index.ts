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

export const authProviderSchema = z.enum(['google', 'github']);

export type AuthProvider = z.infer<typeof authProviderSchema>;

export const authProviderStatusSchema = z.object({
  provider: authProviderSchema,
  configured: z.boolean(),
});

export type AuthProviderStatus = z.infer<typeof authProviderStatusSchema>;

export const authProvidersResponseSchema = z.object({
  providers: z.array(authProviderStatusSchema),
});

export type AuthProvidersResponse = z.infer<typeof authProvidersResponseSchema>;

export const authSessionUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});

export type AuthSessionUser = z.infer<typeof authSessionUserSchema>;

export const authSessionResponseSchema = z.object({
  user: authSessionUserSchema.nullable(),
});

export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;

export const oauthStartResponseSchema = z.object({
  provider: authProviderSchema,
  state: z.string(),
  authorizationUrl: z.string().url().nullable(),
  status: z.enum(['ready', 'provider_not_configured', 'provider_not_implemented']),
});

export type OAuthStartResponse = z.infer<typeof oauthStartResponseSchema>;

export const modelProviderSchema = z.enum(['openai']);

export type ModelProvider = z.infer<typeof modelProviderSchema>;

export const providerCredentialStatusSchema = z.enum(['active', 'invalid']);

export type ProviderCredentialStatus = z.infer<typeof providerCredentialStatusSchema>;

export const providerCredentialSchema = z.object({
  id: z.string(),
  provider: modelProviderSchema,
  label: z.string(),
  maskedKeyPreview: z.string(),
  last4: z.string(),
  status: providerCredentialStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastValidatedAt: z.string().datetime().nullable(),
});

export type ProviderCredential = z.infer<typeof providerCredentialSchema>;

export const providerCredentialsResponseSchema = z.object({
  credentials: z.array(providerCredentialSchema),
});

export type ProviderCredentialsResponse = z.infer<typeof providerCredentialsResponseSchema>;

export const upsertProviderCredentialSchema = z.object({
  provider: modelProviderSchema,
  label: z.string().trim().min(1).max(80),
  apiKey: z.string().trim().min(1),
});

export type UpsertProviderCredentialInput = z.infer<typeof upsertProviderCredentialSchema>;
