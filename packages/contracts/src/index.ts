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
  behaviorConfig: z
    .object({
      initials: z.string().trim().max(3),
      welcomeMessage: z.string().max(1000),
      instructions: z.string().max(8000),
      tone: z.string().max(120),
      handoffBehavior: z.string().max(160),
      widgetTheme: z.string().max(120),
      widgetPosition: z.string().max(80),
      strictKnowledge: z.boolean(),
      promptInjectionProtection: z.boolean(),
      piiRedaction: z.boolean(),
      collectFeedback: z.boolean(),
      humanHandoff: z.boolean(),
    })
    .optional(),
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
  linkedBotCount: z.number().int().min(0),
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

export const botStatusSchema = z.enum(['draft', 'published', 'archived']);

export type BotStatus = z.infer<typeof botStatusSchema>;

export const botResponseLengthSchema = z.enum(['brief', 'balanced', 'detailed']);

export type BotResponseLength = z.infer<typeof botResponseLengthSchema>;

export const botRetrievalModeSchema = z.enum(['hybrid', 'semantic', 'keyword']);

export type BotRetrievalMode = z.infer<typeof botRetrievalModeSchema>;

export const botCitationStyleSchema = z.enum([
  'inline_source_chips',
  'footer_source_list',
  'hidden',
]);

export type BotCitationStyle = z.infer<typeof botCitationStyleSchema>;

export const botModelConfigSchema = z.object({
  providerCredentialId: z.string().nullable(),
  provider: modelProviderSchema.nullable(),
  credentialLabel: z.string().nullable(),
  model: z.string().min(1).max(120),
  temperature: z.number().min(0).max(1),
  responseLength: botResponseLengthSchema,
  retrievalMode: botRetrievalModeSchema,
  maxSources: z.number().int().min(1).max(12),
  citationStyle: botCitationStyleSchema,
});

export type BotModelConfig = z.infer<typeof botModelConfigSchema>;

export const botBehaviorConfigSchema = z.object({
  initials: z.string().trim().max(3),
  welcomeMessage: z.string().max(1000),
  instructions: z.string().max(8000),
  tone: z.string().max(120),
  handoffBehavior: z.string().max(160),
  widgetTheme: z.string().max(120),
  widgetPosition: z.string().max(80),
  strictKnowledge: z.boolean(),
  promptInjectionProtection: z.boolean(),
  piiRedaction: z.boolean(),
  collectFeedback: z.boolean(),
  humanHandoff: z.boolean(),
});

export type BotBehaviorConfig = z.infer<typeof botBehaviorConfigSchema>;

export const botSchema = z.object({
  id: z.string(),
  organisationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: botStatusSchema,
  modelConfig: botModelConfigSchema,
  behaviorConfig: botBehaviorConfigSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Bot = z.infer<typeof botSchema>;

export const botsResponseSchema = z.object({
  bots: z.array(botSchema),
});

export type BotsResponse = z.infer<typeof botsResponseSchema>;

export const updateBotSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  behaviorConfig: botBehaviorConfigSchema.optional(),
  modelConfig: z
    .object({
      providerCredentialId: z.string().nullable(),
      model: z.string().trim().min(1).max(120),
      temperature: z.number().min(0).max(1),
      responseLength: botResponseLengthSchema,
      retrievalMode: botRetrievalModeSchema,
      maxSources: z.number().int().min(1).max(12),
      citationStyle: botCitationStyleSchema,
    })
    .optional(),
});

export type UpdateBotInput = z.infer<typeof updateBotSchema>;
