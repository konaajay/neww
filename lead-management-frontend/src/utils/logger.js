const isDev = import.meta.env.MODE === "development";

export const logger = {
  log: (...args) => isDev && console.log(...args),
  debug: (...args) => isDev && console.debug(...args),
  info: (...args) => isDev && console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};
