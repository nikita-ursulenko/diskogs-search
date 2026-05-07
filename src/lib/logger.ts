/**
 * Simple structured logger for the backend.
 * In production, this can be swapped out for Pino or Winston.
 */

export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, meta ? meta : "");
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, meta ? meta : "");
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error ? error : "");
  },
};
