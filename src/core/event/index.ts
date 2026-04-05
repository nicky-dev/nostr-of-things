/**
 * Core Event Module — NIP-01 compliant event creation, hashing, and validation
 */

import { createHash } from 'crypto';

/** Custom IoT event kinds for NoT (NIP-XX-IoT) */
export const EVENT_KINDS = {
  SENSOR_DATA: 30078,
  SENSOR_ALERT: 30079,
  DEVICE_CMD: 4078,
  DEVICE_STATUS: 4079,
  DEVICE_EVENT: 30080,
  TELEMETRY_METRIC: 30081,
  TELEMETRY_ERROR: 30082,
} as const;

export type EventKind = (typeof EVENT_KINDS)[keyof typeof EVENT_KINDS];

export interface NotEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export type UnsignedEvent = Omit<NotEvent, 'id' | 'sig'>;

/**
 * Serialize event fields into the canonical NIP-01 format for hashing.
 * Format: [0, pubkey, created_at, kind, tags, content]
 */
export function serializeForHashing(event: UnsignedEvent): string {
  return JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
}

/**
 * Compute the SHA-256 event ID from an unsigned event (NIP-01).
 */
export function computeEventId(event: UnsignedEvent): string {
  const serialized = serializeForHashing(event);
  return createHash('sha256').update(serialized).digest('hex');
}

/**
 * Create an unsigned event template with the current timestamp.
 */
export function createEventTemplate(
  kind: number,
  pubkey: string,
  content: string,
  tags: string[][]
): UnsignedEvent {
  return {
    pubkey: pubkey.toLowerCase(),
    created_at: Math.floor(Date.now() / 1000),
    kind,
    tags,
    content,
  };
}

/**
 * Validate the structure and ID integrity of a signed NotEvent.
 * Returns false if any field is missing, malformed, or the ID does not match.
 */
export function validateEvent(event: NotEvent): boolean {
  if (typeof event.id !== 'string' || event.id.length !== 64) return false;
  if (typeof event.pubkey !== 'string' || event.pubkey.length !== 64) return false;
  if (typeof event.created_at !== 'number' || !Number.isInteger(event.created_at)) return false;
  if (typeof event.kind !== 'number') return false;
  if (!Array.isArray(event.tags)) return false;
  if (typeof event.content !== 'string') return false;
  if (typeof event.sig !== 'string' || event.sig.length !== 128) return false;

  // pubkey must be lowercase hex
  if (event.pubkey !== event.pubkey.toLowerCase()) return false;

  // Verify that the event id matches the computed hash
  const unsigned: UnsignedEvent = {
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: event.tags,
    content: event.content,
  };
  return event.id === computeEventId(unsigned);
}
