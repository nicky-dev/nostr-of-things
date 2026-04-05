import {
  timestampToIso,
  isoToTimestamp,
  serializeEvent,
  deserializeEvent,
  formatSensorReading,
} from '@not/core/../utils/helpers';

describe('timestampToIso', () => {
  it('should convert Unix seconds to ISO 8601 string', () => {
    const ts = 1647884523;
    const iso = timestampToIso(ts);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(new Date(iso).getTime()).toBe(ts * 1000);
  });

  it('should use Unix seconds, not milliseconds', () => {
    const ts = 1000;
    const iso = timestampToIso(ts);
    expect(new Date(iso).getFullYear()).toBe(1970);
  });
});

describe('isoToTimestamp', () => {
  it('should convert ISO string to Unix seconds', () => {
    const iso = '2022-03-21T14:42:03.000Z';
    const ts = isoToTimestamp(iso);
    expect(typeof ts).toBe('number');
    expect(ts).toBe(Math.floor(new Date(iso).getTime() / 1000));
  });

  it('should be the inverse of timestampToIso', () => {
    const ts = 1647884523;
    expect(isoToTimestamp(timestampToIso(ts))).toBe(ts);
  });
});

describe('serializeEvent', () => {
  it('should return a JSON string', () => {
    const result = serializeEvent({ kind: 30078, content: 'hello' });
    expect(typeof result).toBe('string');
    expect(JSON.parse(result)).toEqual({ kind: 30078, content: 'hello' });
  });

  it('should produce deterministic output', () => {
    const obj = { a: 1, b: 'test' };
    expect(serializeEvent(obj)).toBe(serializeEvent(obj));
  });
});

describe('deserializeEvent', () => {
  it('should parse a JSON string to an object', () => {
    const json = '{"kind":30078,"content":"hello"}';
    const result = deserializeEvent(json);
    expect(result).toEqual({ kind: 30078, content: 'hello' });
  });

  it('should throw on invalid JSON', () => {
    expect(() => deserializeEvent('not-json')).toThrow();
  });

  it('should be the inverse of serializeEvent', () => {
    const obj = { kind: 30078, content: 'test', tags: [] };
    expect(deserializeEvent(serializeEvent(obj))).toEqual(obj);
  });
});

describe('formatSensorReading', () => {
  it('should return a JSON string', () => {
    const result = formatSensorReading('temperature', 22.5, 'celsius');
    const parsed = JSON.parse(result) as {
      sensor: string;
      value: number;
      unit: string;
      timestamp: number;
    };
    expect(parsed.sensor).toBe('temperature');
    expect(parsed.value).toBe(22.5);
    expect(parsed.unit).toBe('celsius');
    expect(typeof parsed.timestamp).toBe('number');
  });

  it('should use Unix seconds for timestamp', () => {
    const before = Math.floor(Date.now() / 1000);
    const result = formatSensorReading('temp', 20, 'celsius');
    const after = Math.floor(Date.now() / 1000);
    const { timestamp } = JSON.parse(result) as { timestamp: number };
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});
