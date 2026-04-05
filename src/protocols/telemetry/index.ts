/**
 * Telemetry Protocol — kinds 30081 (telemetry.metric) and 30082 (telemetry.error)
 *
 * Parameterized replaceable events for device health and operational metrics.
 */

import { EVENT_KINDS, createEventTemplate, NotEvent, UnsignedEvent } from '../../core/event';
import { signEvent } from '../../utils/nsec';

// ─── Payload types ────────────────────────────────────────────────────────────

export interface TelemetryMetricPayload {
  device_id: string;
  metric: string;
  value: number;
  tags?: string[];
}

export interface TelemetryErrorPayload {
  device_id: string;
  error: string;
  stack?: string;
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Create a signed telemetry.metric event (kind 30081).
 * Tag `d = {devicePubkey}:{metric}` for parameterized replaceability.
 */
export function createTelemetryMetricEvent(
  payload: TelemetryMetricPayload,
  devicePubkey: string,
  privateKey: string
): NotEvent {
  const dTag = `${devicePubkey}:${payload.metric}`;
  const tags: string[][] = [
    ['d', dTag],
    ['t', 'telemetry.metric'],
  ];

  if (payload.tags && payload.tags.length > 0) {
    tags.push(['label', ...payload.tags]);
  }

  const unsigned: UnsignedEvent = createEventTemplate(
    EVENT_KINDS.TELEMETRY_METRIC,
    devicePubkey,
    JSON.stringify(payload),
    tags
  );

  return signEvent(unsigned, privateKey);
}

/**
 * Create a signed telemetry.error event (kind 30082).
 * Tag `d = {devicePubkey}:{error_slug}` using a truncated error slug.
 */
export function createTelemetryErrorEvent(
  payload: TelemetryErrorPayload,
  devicePubkey: string,
  privateKey: string
): NotEvent {
  const errorSlug = payload.error.slice(0, 32).replace(/\s+/g, '_').toLowerCase();
  const dTag = `${devicePubkey}:${errorSlug}`;
  const tags: string[][] = [
    ['d', dTag],
    ['t', 'telemetry.error'],
  ];

  const unsigned: UnsignedEvent = createEventTemplate(
    EVENT_KINDS.TELEMETRY_ERROR,
    devicePubkey,
    JSON.stringify(payload),
    tags
  );

  return signEvent(unsigned, privateKey);
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Parse the content field of a telemetry.metric event.
 */
export function parseTelemetryMetricPayload(event: NotEvent): TelemetryMetricPayload {
  return JSON.parse(event.content) as TelemetryMetricPayload;
}

/**
 * Parse the content field of a telemetry.error event.
 */
export function parseTelemetryErrorPayload(event: NotEvent): TelemetryErrorPayload {
  return JSON.parse(event.content) as TelemetryErrorPayload;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a telemetry.metric payload.
 */
export function validateTelemetryMetricPayload(payload: TelemetryMetricPayload): boolean {
  if (typeof payload.device_id !== 'string' || payload.device_id.length === 0) return false;
  if (typeof payload.metric !== 'string' || payload.metric.length === 0) return false;
  if (typeof payload.value !== 'number') return false;
  if (payload.tags !== undefined && !Array.isArray(payload.tags)) return false;
  return true;
}

/**
 * Validate a telemetry.error payload.
 */
export function validateTelemetryErrorPayload(payload: TelemetryErrorPayload): boolean {
  if (typeof payload.device_id !== 'string' || payload.device_id.length === 0) return false;
  if (typeof payload.error !== 'string' || payload.error.length === 0) return false;
  if (payload.stack !== undefined && typeof payload.stack !== 'string') return false;
  return true;
}
