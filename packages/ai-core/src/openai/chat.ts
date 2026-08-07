import type { ChatModelChunk, ChatModelProvider, ChatModelRequest } from '../index.js';
import { fetchOpenAiWithRetry } from './http.js';
import { MODEL_PRICING, estimateCostUsd } from './pricing.js';

export interface OpenAIProviderOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

interface OpenAiChatStreamEvent {
  choices?: { delta?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export class OpenAIChatModelProvider implements ChatModelProvider {
  constructor(private readonly options: OpenAIProviderOptions) {}

  async *streamChat(request: ChatModelRequest): AsyncIterable<ChatModelChunk> {
    const startedAt = Date.now();
    const baseUrl = this.options.baseUrl ?? DEFAULT_BASE_URL;

    let response: Response;
    try {
      response = await fetchOpenAiWithRetry({
        url: `${baseUrl}/chat/completions`,
        apiKey: this.options.apiKey,
        timeoutMs: this.options.timeoutMs,
        signal: request.signal,
        body: {
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxOutputTokens,
          stream: true,
          stream_options: { include_usage: true },
        },
      });
    } catch (error) {
      if (isAbortError(error) && request.signal?.aborted) {
        return;
      }
      throw error;
    }

    if (!response.body) {
      throw new Error('OpenAI response had no body to stream.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let promptTokens = 0;
    let completionTokens = 0;
    let aborted = false;

    const onAbort = () => {
      aborted = true;
      reader.cancel().catch(() => {});
    };
    request.signal?.addEventListener('abort', onAbort);

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          const dataLine = event.split('\n').find((line) => line.startsWith('data:'));
          if (!dataLine) continue;

          const data = dataLine.slice(5).trim();
          if (data === '[DONE]') continue;

          const parsed = JSON.parse(data) as OpenAiChatStreamEvent;

          if (parsed.usage) {
            promptTokens = parsed.usage.prompt_tokens ?? promptTokens;
            completionTokens = parsed.usage.completion_tokens ?? completionTokens;
          }

          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield { type: 'content', content };
          }
        }
      }
    } catch (error) {
      if (!aborted) throw error;
    } finally {
      reader.releaseLock();
      request.signal?.removeEventListener('abort', onAbort);
    }

    if (aborted) return;

    const pricingKnown = request.model in MODEL_PRICING;
    yield {
      type: 'metadata',
      metadata: {
        model: request.model,
        provider: 'openai',
        promptTokens,
        completionTokens,
        latencyMs: Date.now() - startedAt,
        estCostUsd: estimateCostUsd(request.model, promptTokens, completionTokens),
        ...(pricingKnown ? {} : { pricingNote: 'unknown_model_default_zero_cost' }),
      },
    };
    yield { type: 'done' };
  }
}
