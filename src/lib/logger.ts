import pino from 'pino';

function getTransport() {
  if (process.env.NODE_ENV === 'production') return undefined;
  try {
    // Resolve pino-pretty from this package's node_modules (pnpm strict mode)
    const target = require.resolve('pino-pretty');
    return { target, options: { colorize: true } };
  } catch {
    return undefined;
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: getTransport(),
});

export function createLogger(context: {
  service: 'api' | 'worker';
  orgId?: string;
  connectionId?: string;
}) {
  return logger.child(context);
}
