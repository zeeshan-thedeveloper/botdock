import pino from 'pino';

export function createLogger(service: string, level = 'info') {
  return pino({
    level,
    base: { service },
    messageKey: 'message',
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
