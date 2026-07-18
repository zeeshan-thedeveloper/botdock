export interface ChatModelMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatModelRequest {
  model: string;
  messages: ChatModelMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  metadata?: Record<string, string>;
}

export interface ChatModelChunk {
  type: 'content' | 'metadata' | 'done';
  content?: string;
  metadata?: Record<string, string | number>;
}

export interface ChatModelProvider {
  streamChat(request: ChatModelRequest): AsyncIterable<ChatModelChunk>;
}

export interface EmbeddingProvider {
  generateEmbeddings(inputs: string[]): Promise<number[][]>;
}

export class MockChatModelProvider implements ChatModelProvider {
  async *streamChat(request: ChatModelRequest): AsyncIterable<ChatModelChunk> {
    const latestUserMessage = [...request.messages]
      .reverse()
      .find((message) => message.role === 'user');
    const response = `Mock BotDock response for: ${latestUserMessage?.content ?? 'empty prompt'}`;

    for (const token of response.split(' ')) {
      yield { type: 'content', content: `${token} ` };
    }

    yield {
      type: 'metadata',
      metadata: {
        model: request.model,
        provider: 'mock',
      },
    };
    yield { type: 'done' };
  }
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  async generateEmbeddings(inputs: string[]): Promise<number[][]> {
    return inputs.map((input) => [input.length, input.split(/\s+/).filter(Boolean).length, 1]);
  }
}
