import type { EmbeddingProvider } from '../index.js';
import { fetchOpenAiWithRetry } from './http.js';

export interface OpenAIEmbeddingProviderOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  /** Embedding model id. Defaults to 'text-embedding-3-small'. */
  model?: string;
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100;

interface OpenAiEmbeddingResponse {
  data: { index: number; embedding: number[] }[];
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private readonly model: string;

  constructor(private readonly options: OpenAIEmbeddingProviderOptions) {
    this.model = options.model ?? DEFAULT_MODEL;
  }

  async generateEmbeddings(inputs: string[]): Promise<number[][]> {
    const baseUrl = this.options.baseUrl ?? DEFAULT_BASE_URL;
    const results: number[][] = new Array(inputs.length);

    for (let start = 0; start < inputs.length; start += BATCH_SIZE) {
      const batch = inputs.slice(start, start + BATCH_SIZE);

      const response = await fetchOpenAiWithRetry({
        url: `${baseUrl}/embeddings`,
        apiKey: this.options.apiKey,
        timeoutMs: this.options.timeoutMs,
        body: { model: this.model, input: batch },
      });

      const payload = (await response.json()) as OpenAiEmbeddingResponse;
      for (const item of payload.data) {
        results[start + item.index] = item.embedding;
      }
    }

    return results;
  }
}
