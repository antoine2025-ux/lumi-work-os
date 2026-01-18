/**
 * Performance Guardrails
 * 
 * Hard caps for expensive operations to keep Loopbrain fast as context grows.
 * Enforces limits on DB queries, capacity users, and tasks scanned.
 */

import { LoopbrainError } from './errors'
import { logger } from '@/lib/logger'

/**
 * Maximum DB queries per request
 */
export const MAX_DB_QUERIES_PER_REQUEST = 25

/**
 * Maximum users to process for capacity planning
 */
export const MAX_CAPACITY_USERS = 60

/**
 * Maximum tasks to scan for capacity planning
 */
export const MAX_TASKS_SCANNED_FOR_CAPACITY = 2000

/**
 * Request-level DB query counter
 * Thread-safe for single-threaded Node.js (per request)
 */
export class DbQueryCounter {
  private count = 0
  private readonly maxQueries: number
  private readonly requestId?: string

  constructor(maxQueries: number = MAX_DB_QUERIES_PER_REQUEST, requestId?: string) {
    this.maxQueries = maxQueries
    this.requestId = requestId
  }

  /**
   * Increment query count and check limit
   * 
   * @throws LoopbrainError if limit exceeded
   */
  increment(): void {
    this.count++
    
    if (this.count > this.maxQueries) {
      logger.warn('DB query limit exceeded', {
        requestId: this.requestId,
        queryCount: this.count,
        maxQueries: this.maxQueries,
      })
      
      throw new LoopbrainError(
        'DB_ERROR',
        503,
        true,
        {
          message: 'Workspace is large; please narrow your query.',
          queryCount: this.count,
          maxQueries: this.maxQueries,
        }
      )
    }
  }

  /**
   * Get current query count
   */
  getCount(): number {
    return this.count
  }

  /**
   * Reset counter (for testing)
   */
  reset(): void {
    this.count = 0
  }
}

/**
 * Check capacity planning limits
 * 
 * @param userCount - Number of users being processed
 * @param taskCount - Number of tasks being scanned
 * @param requestId - Optional request ID for logging
 * @throws LoopbrainError if limits exceeded
 */
export function checkCapacityLimits(
  userCount: number,
  taskCount: number,
  requestId?: string
): void {
  if (userCount > MAX_CAPACITY_USERS) {
    logger.warn('Capacity users limit exceeded', {
      requestId,
      userCount,
      maxUsers: MAX_CAPACITY_USERS,
    })
    
    throw new LoopbrainError(
      'DB_ERROR',
      503,
      true,
      {
        message: 'Workspace is large; please narrow your query.',
        userCount,
        maxUsers: MAX_CAPACITY_USERS,
      }
    )
  }

  if (taskCount > MAX_TASKS_SCANNED_FOR_CAPACITY) {
    logger.warn('Capacity tasks limit exceeded', {
      requestId,
      taskCount,
      maxTasks: MAX_TASKS_SCANNED_FOR_CAPACITY,
    })
    
    throw new LoopbrainError(
      'DB_ERROR',
      503,
      true,
      {
        message: 'Workspace is large; please narrow your query.',
        taskCount,
        maxTasks: MAX_TASKS_SCANNED_FOR_CAPACITY,
      }
    )
  }
}

