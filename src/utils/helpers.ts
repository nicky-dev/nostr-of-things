/**
 * Helper utilities for NoT
 */

/**
 * Convert Unix seconds timestamp to ISO string
 */
export function timestampToIso(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Parse ISO string to Unix seconds timestamp
 */
export function isoToTimestamp(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

/**
 * Serialize a value to JSON string
 */
export function serializeEvent(event: Record<string, unknown>): string {
  return JSON.stringify(event);
}

/**
 * Deserialize a JSON string to an object
 */
export function deserializeEvent(json: string): Record<string, unknown> {
  return JSON.parse(json) as Record<string, unknown>;
}

/**
 * Format a sensor reading with a Unix seconds timestamp
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
    timestamp: Math.floor(Date.now() / 1000),
  });
}
