import type { ChatConversationSource } from '@botdock/contracts';

export interface ChatRunInput {
  organisationId: string;
  botId: string;
  configVersion: 'draft' | 'published';
  conversationId?: string;
  /** Opaque visitor identifier for the WIDGET path; never a user/org id. */
  visitorId?: string;
  userMessage: string;
  source: ChatConversationSource;
  debug: boolean;
  signal?: AbortSignal;
}
