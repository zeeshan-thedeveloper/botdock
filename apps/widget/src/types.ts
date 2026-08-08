import type { ChatCitationSource } from '@botdock/sdk';

export type WidgetConfig = {
  deploymentId: string;
  apiBaseUrl: string;
  welcomeMessage: string;
  accentColor: string;
  position: 'bottom-right' | 'bottom-left';
};

export type WidgetMessageStatus = 'complete' | 'streaming' | 'error';

export type WidgetMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: WidgetMessageStatus;
  citations?: ChatCitationSource[];
  errorMessage?: string;
};
