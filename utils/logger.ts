// Lightweight logger. Debug/info are silenced outside development so no console
// noise ships to production; warnings and errors always surface.
const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : false;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
