/**
 * Sensor Protocol — kinds 30078 (sensor.data) and 30079 (sensor.alert)
 *
 * Implements the Define → Serialize → Validate pattern for sensor events.
 * All sensor events are parameterized replaceable events tagged with
 * `d = {device_pubkey}:{sensor_id}` for addressability.
 */

import { EVENT_KINDS, createEventTemplate, NotEvent, UnsignedEvent } from '../../core/event';
import { signEvent } from '../../utils/nsec';

// ─── Payload types ────────────────────────────────────────────────────────────

export type SensorAlertSeverity = 'info' | 'warning' | 'critical';

export interface SensorDataPayload {
  sensor_id: string;
  readings: Record<string, number>;
  metadata?: {
    unit: string;
    accuracy: number;
    sample_rate: number;
  };
}

export interface SensorAlertPayload {
  sensor_id: string;
  message: string;
  severity: SensorAlertSeverity;
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Create a signed sensor.data event (kind 30078).
 * Tag `d = {devicePubkey}:{sensorId}` for parameterized replaceability.
 */
export function createSensorDataEvent(
  payload: SensorDataPayload,
  devicePubkey: string,
  privateKey: string
): NotEvent {
  const dTag = `${devicePubkey}:${payload.sensor_id}`;
  const tags: string[][] = [
    ['d', dTag],
    ['t', 'sensor.data'],
  ];

  const unsigned: UnsignedEvent = createEventTemplate(
    EVENT_KINDS.SENSOR_DATA,
    devicePubkey,
    JSON.stringify(payload),
    tags
  );

  return signEvent(unsigned, privateKey);
}

/**
 * Create a signed sensor.alert event (kind 30079).
 */
export function createSensorAlertEvent(
  payload: SensorAlertPayload,
  devicePubkey: string,
  privateKey: string
): NotEvent {
  const dTag = `${devicePubkey}:${payload.sensor_id}`;
  const tags: string[][] = [
    ['d', dTag],
    ['t', 'sensor.alert'],
    ['severity', payload.severity],
  ];

  const unsigned: UnsignedEvent = createEventTemplate(
    EVENT_KINDS.SENSOR_ALERT,
    devicePubkey,
    JSON.stringify(payload),
    tags
  );

  return signEvent(unsigned, privateKey);
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Parse the content field of a sensor.data event.
 */
export function parseSensorDataPayload(event: NotEvent): SensorDataPayload {
  return JSON.parse(event.content) as SensorDataPayload;
}

/**
 * Parse the content field of a sensor.alert event.
 */
export function parseSensorAlertPayload(event: NotEvent): SensorAlertPayload {
  return JSON.parse(event.content) as SensorAlertPayload;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a sensor.data payload.
 */
export function validateSensorDataPayload(payload: SensorDataPayload): boolean {
  if (typeof payload.sensor_id !== 'string' || payload.sensor_id.length === 0) return false;
  if (typeof payload.readings !== 'object' || payload.readings === null) return false;
  for (const value of Object.values(payload.readings)) {
    if (typeof value !== 'number') return false;
  }
  if (payload.metadata !== undefined) {
    const { unit, accuracy, sample_rate } = payload.metadata;
    if (typeof unit !== 'string') return false;
    if (typeof accuracy !== 'number') return false;
    if (typeof sample_rate !== 'number') return false;
  }
  return true;
}

/**
 * Validate a sensor.alert payload.
 */
export function validateSensorAlertPayload(payload: SensorAlertPayload): boolean {
  if (typeof payload.sensor_id !== 'string' || payload.sensor_id.length === 0) return false;
  if (typeof payload.message !== 'string' || payload.message.length === 0) return false;
  const validSeverities: SensorAlertSeverity[] = ['info', 'warning', 'critical'];
  return validSeverities.includes(payload.severity);
}
