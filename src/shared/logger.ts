/**
 * Simple logger implementation for the MCP server.
 * Logs messages to stderr to be potentially captured by MCP clients/Inspector.
 */
const log = {
  /** Log informational messages. */
  info: (message: string, ...args: unknown[]) => {
    console.error(`[INFO] ${message}`, ...args);
  },
  /** Log error messages. */
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  /** Log warning messages. */
  warn: (message: string, ...args: unknown[]) => {
    console.error(`[WARN] ${message}`, ...args);
  },
  /** Log debug messages (only in development environment). */
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === "development") {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  },
};

export default log;
