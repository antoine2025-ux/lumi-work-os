/**
 * Availability Module
 * 
 * Phase G: Canonical availability event handling with precedence rules.
 */

export {
  getAvailabilityEvents,
  getAvailabilityEventsBatch,
  computeEffectiveAvailability,
  computeMinAvailabilityInWindow,
  type AvailabilityEvent,
  type AvailabilityExplanation,
  type LimitingEvent,
} from "./read";
