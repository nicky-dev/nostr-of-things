/**
 * Helper utilities for NoT
 */

/**
 * Convert timestamp to ISO string
 */
export function timestampToIso(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Parse ISO string to timestamp
 */
export function isoToTimestamp(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

/**
 * Serialize event to JSON
 */
export function serializeEvent(event: any): string {
  return JSON.stringify(event);
}

/**
 * Deserialize JSON to event
 */
export function deserializeEvent(json: string): any {
  return JSON.parse(json);
}

/**
 * Format sensor reading with timestamp
 */
export function formatSensorReading(
  sensor: string,
  value: number,
  unit: string
): string {
  return JSON.stringify({
    sensor,
    value,
    unit,
    timestamp: Date.now(),
  });
}
