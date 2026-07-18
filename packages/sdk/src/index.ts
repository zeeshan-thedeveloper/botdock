export interface BotDockClientOptions {
  apiBaseUrl: string;
  apiKey?: string;
}

export class BotDockClient {
  constructor(private readonly options: BotDockClientOptions) {}

  get apiBaseUrl() {
    return this.options.apiBaseUrl;
  }
}
