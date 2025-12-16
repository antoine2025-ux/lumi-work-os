import { NextRequest } from 'next/server'

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogContext {
  userId?: string
  workspaceId?: string
  requestId?: string
  sessionId?: string
  projectId?: string
  taskId?: string
  wikiPageId?: string
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  private formatMessage(level: LogLevel, message: string, context?: LogContext, error?: Error | undefined) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...(context && { context }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: this.isDevelopment ? error.stack : undefined
        }
      })
    }

    if (this.isDevelopment) {
      // Pretty print for development
      const emoji = this.getEmoji(level)
      console.log(`${emoji} [${timestamp}] ${level.toUpperCase()}: ${message}`)
      if (context) console.log('  Context:', context)
      if (error) console.log('  Error:', error.message)
    } else {
      // JSON format for production
      console.log(JSON.stringify(logEntry))
    }

    return logEntry
  }

  private getEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return '❌'
      case LogLevel.WARN: return '⚠️'
      case LogLevel.INFO: return 'ℹ️'
      case LogLevel.DEBUG: return '🐛'
      default: return '📝'
    }
  }

  error(message: string, context?: LogContext, error?: unknown) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    return this.formatMessage(LogLevel.ERROR, message, context, errorObj)
  }

  warn(message: string, context?: LogContext, error?: unknown) {
    const errorObj = error instanceof Error ? error : (error ? new Error(String(error)) : undefined)
    return this.formatMessage(LogLevel.WARN, message, context, errorObj)
  }

  info(message: string, context?: LogContext) {
    return this.formatMessage(LogLevel.INFO, message, context)
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      return this.formatMessage(LogLevel.DEBUG, message, context)
    }
  }

  // API request logging
  logRequest(request: NextRequest, context?: LogContext) {
    const requestContext = {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      ...context
    }

    this.info(`API Request: ${request.method} ${request.url}`, requestContext)
    return requestContext
  }

  // API response logging
  logResponse(request: NextRequest, statusCode: number, responseTime: number, context?: LogContext) {
    const responseContext = {
      method: request.method,
      url: request.url,
      statusCode,
      responseTime: `${responseTime}ms`,
      ...context
    }

    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO
    this.formatMessage(level, `API Response: ${request.method} ${request.url}`, responseContext)
    return responseContext
  }

  // Database operation logging
  logDatabaseOperation(operation: string, table: string, duration: number, context?: LogContext) {
    const dbContext = {
      operation,
      table,
      duration: `${duration}ms`,
      ...context
    }

    this.debug(`Database ${operation} on ${table}`, dbContext)
    return dbContext
  }

  // Authentication logging
  logAuth(event: 'login' | 'logout' | 'session_expired' | 'unauthorized', context?: LogContext) {
    const authContext = {
      event,
      ...context
    }

    this.info(`Auth Event: ${event}`, authContext)
    return authContext
  }

  // Performance logging
  logPerformance(operation: string, duration: number, context?: LogContext) {
    const perfContext = {
      operation,
      duration: `${duration}ms`,
      ...context
    }

    if (duration > 1000) {
      this.warn(`Slow operation: ${operation}`, perfContext)
    } else {
      this.debug(`Performance: ${operation}`, perfContext)
    }
    return perfContext
  }
}

export const logger = new Logger()

// Request ID middleware
export function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Extract context from request
export function extractRequestContext(request: NextRequest): LogContext {
  return {
    requestId: generateRequestId(),
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
  }
}



