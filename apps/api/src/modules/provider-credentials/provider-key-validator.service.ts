import { Injectable } from '@nestjs/common';

const OPENAI_MODELS_URL = 'https://api.openai.com/v1/models';

export type ProviderValidationResult = {
  usable: boolean;
};

@Injectable()
export class ProviderKeyValidatorService {
  async validateOpenAIKey(apiKey: string): Promise<ProviderValidationResult> {
    try {
      const response = await fetch(OPENAI_MODELS_URL, {
        headers: {
          authorization: `Bearer ${apiKey}`,
          'user-agent': 'BotDock API',
        },
      });

      return { usable: response.ok };
    } catch {
      return { usable: false };
    }
  }
}
