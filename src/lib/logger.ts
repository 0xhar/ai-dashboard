import pino from 'pino';

// Note: pino transports (pino-pretty) don't work with Next.js Turbopack
// because the module path gets mangled. For pretty dev logs, pipe output:
//   pnpm dev 2>&1 | pnpm pino-pretty
// The worker process uses pino-pretty via the tsx entrypoint (not Turbopack).
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export function createLogger(context: {
  service: 'api' | 'worker';
  orgId?: string;
  connectionId?: string;
}) {
  return logger.child(context);
}
