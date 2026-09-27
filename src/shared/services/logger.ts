type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class Logger {
  private isDev = import.meta.env.DEV

  private formatMessage(level: LogLevel, message: string, context?: unknown): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  debug(message: string, context?: unknown) {
    if (this.isDev) {
      console.debug(this.formatMessage('debug', message, context))
    }
  }

  info(message: string, context?: unknown) {
    console.info(this.formatMessage('info', message, context))
  }

  warn(message: string, context?: unknown) {
    console.warn(this.formatMessage('warn', message, context))
  }

  error(message: string, error?: unknown, context?: unknown) {
    const errContext = error instanceof Error 
      ? { message: error.message, stack: error.stack, ...((context as object) || {}) } 
      : { error, ...((context as object) || {}) }
    console.error(this.formatMessage('error', message, errContext))
  }
}

export const logger = new Logger()
