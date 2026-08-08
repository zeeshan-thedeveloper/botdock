export interface ModelPricing {
  inputPerMTokens: number;
  outputPerMTokens: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o-mini': { inputPerMTokens: 0.15, outputPerMTokens: 0.6 },
  'gpt-4o': { inputPerMTokens: 2.5, outputPerMTokens: 10 },
  'text-embedding-3-small': { inputPerMTokens: 0.02, outputPerMTokens: 0 },
};

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    return 0;
  }

  return (
    (promptTokens / 1_000_000) * pricing.inputPerMTokens +
    (completionTokens / 1_000_000) * pricing.outputPerMTokens
  );
}
