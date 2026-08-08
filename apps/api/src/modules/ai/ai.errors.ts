export class ProviderNotConfiguredError extends Error {
  constructor(message = 'Organisation has no active provider credential configured.') {
    super(message);
    this.name = 'ProviderNotConfiguredError';
  }
}
