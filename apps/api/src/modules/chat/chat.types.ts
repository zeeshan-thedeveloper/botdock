import type { ChatConversationSource } from '@botdock/contracts';

export interface ChatRunInput {
  organisationId: string;
  botId: string;
  configVersion: 'draft' | 'published';
  conversationId?: string;
  userMessage: string;
  source: ChatConversationSource;
  debug: boolean;
  signal?: AbortSignal;
}
