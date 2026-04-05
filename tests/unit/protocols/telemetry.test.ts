import {
  createTelemetryMetricEvent,
  createTelemetryErrorEvent,
  parseTelemetryMetricPayload,
  parseTelemetryErrorPayload,
  validateTelemetryMetricPayload,
  validateTelemetryErrorPayload,
  TelemetryMetricPayload,
  TelemetryErrorPayload,
} from '@not/protocols/telemetry';
import { EVENT_KINDS } from '@not/core/event';

const devicePubkey = 'a'.repeat(64);
const privateKey = 'b'.repeat(128);

describe('createTelemetryMetricEvent', () => {
  const payload: TelemetryMetricPayload = {
    device_id: 'dev-1',
    metric: 'cpu_usage',
    value: 42.5,
    tags: ['production', 'region-us'],
  };

  it('should return an event with kind 30081', () => {
    const event = createTelemetryMetricEvent(payload, devicePubkey, privateKey);
    expect(event.kind).toBe(EVENT_KINDS.TELEMETRY_METRIC);
  });

  it('should include the d tag with device:metric format', () => {
    const event = createTelemetryMetricEvent(payload, devicePubkey, privateKey);
    const dTag = event.tags.find((t) => t[0] === 'd');
    expect(dTag?.[1]).toBe(`${devicePubkey}:cpu_usage`);
  });

  it('should include the t tag set to telemetry.metric', () => {
    const event = createTelemetryMetricEvent(payload, devicePubkey, privateKey);
    const tTag = event.tags.find((t) => t[0] === 't');
    expect(tTag?.[1]).toBe('telemetry.metric');
  });

  it('should include the label tag when tags are provided', () => {
    const event = createTelemetryMetricEvent(payload, devicePubkey, privateKey);
    const labelTag = event.tags.find((t) => t[0] === 'label');
    expect(labelTag).toBeDefined();
    expect(labelTag).toContain('production');
    expect(labelTag).toContain('region-us');
  });

  it('should not include a label tag when no tags are provided', () => {
    const noTagsPayload: TelemetryMetricPayload = {
      device_id: 'dev-1',
      metric: 'uptime',
      value: 3600,
    };
    const event = createTelemetryMetricEvent(noTagsPayload, devicePubkey, privateKey);
    const labelTag = event.tags.find((t) => t[0] === 'label');
    expect(labelTag).toBeUndefined();
  });

  it('should JSON-stringify the payload in content', () => {
    const event = createTelemetryMetricEvent(payload, devicePubkey, privateKey);
    const parsed = JSON.parse(event.content) as TelemetryMetricPayload;
    expect(parsed.metric).toBe('cpu_usage');
    expect(parsed.value).toBe(42.5);
  });
});

describe('createTelemetryErrorEvent', () => {
  const payload: TelemetryErrorPayload = {
    device_id: 'dev-1',
    error: 'Connection timeout',
    stack: 'Error: Connection timeout\n  at relay.ts:42',
  };

  it('should return an event with kind 30082', () => {
    const event = createTelemetryErrorEvent(payload, devicePubkey, privateKey);
    expect(event.kind).toBe(EVENT_KINDS.TELEMETRY_ERROR);
  });

  it('should include a d tag derived from the error message', () => {
    const event = createTelemetryErrorEvent(payload, devicePubkey, privateKey);
    const dTag = event.tags.find((t) => t[0] === 'd');
    expect(dTag).toBeDefined();
    expect(dTag?.[1]).toContain(devicePubkey);
  });

  it('should include the t tag set to telemetry.error', () => {
    const event = createTelemetryErrorEvent(payload, devicePubkey, privateKey);
    const tTag = event.tags.find((t) => t[0] === 't');
    expect(tTag?.[1]).toBe('telemetry.error');
  });

  it('should JSON-stringify the payload in content', () => {
    const event = createTelemetryErrorEvent(payload, devicePubkey, privateKey);
    const parsed = JSON.parse(event.content) as TelemetryErrorPayload;
    expect(parsed.error).toBe('Connection timeout');
    expect(parsed.stack).toContain('relay.ts');
  });
});

describe('parseTelemetryMetricPayload', () => {
  it('should parse a telemetry.metric content', () => {
    const payload: TelemetryMetricPayload = {
      device_id: 'dev-1',
      metric: 'memory',
      value: 512,
    };
    const event = createTelemetryMetricEvent(payload, devicePubkey, privateKey);
    const parsed = parseTelemetryMetricPayload(event);
    expect(parsed.metric).toBe('memory');
    expect(parsed.value).toBe(512);
  });
});

describe('parseTelemetryErrorPayload', () => {
  it('should parse a telemetry.error content', () => {
    const payload: TelemetryErrorPayload = {
      device_id: 'dev-1',
      error: 'Out of memory',
    };
    const event = createTelemetryErrorEvent(payload, devicePubkey, privateKey);
    const parsed = parseTelemetryErrorPayload(event);
    expect(parsed.error).toBe('Out of memory');
  });
});

describe('validateTelemetryMetricPayload', () => {
  it('should accept a valid payload', () => {
    expect(
      validateTelemetryMetricPayload({ device_id: 'dev', metric: 'cpu', value: 50 })
    ).toBe(true);
  });

  it('should accept a payload with optional tags', () => {
    expect(
      validateTelemetryMetricPayload({
        device_id: 'dev',
        metric: 'cpu',
        value: 50,
        tags: ['production'],
      })
    ).toBe(true);
  });

  it('should reject empty device_id', () => {
    expect(validateTelemetryMetricPayload({ device_id: '', metric: 'cpu', value: 50 })).toBe(false);
  });

  it('should reject empty metric', () => {
    expect(validateTelemetryMetricPayload({ device_id: 'dev', metric: '', value: 50 })).toBe(false);
  });

  it('should reject non-number value', () => {
    expect(
      validateTelemetryMetricPayload({
        device_id: 'dev',
        metric: 'cpu',
        value: 'high' as unknown as number,
      })
    ).toBe(false);
  });

  it('should reject non-array tags', () => {
    expect(
      validateTelemetryMetricPayload({
        device_id: 'dev',
        metric: 'cpu',
        value: 50,
        tags: 'production' as unknown as string[],
      })
    ).toBe(false);
  });

  it('should reject tags array containing non-string elements', () => {
    expect(
      validateTelemetryMetricPayload({
        device_id: 'dev',
        metric: 'cpu',
        value: 50,
        tags: [42, 'production'] as unknown as string[],
      })
    ).toBe(false);
  });
});

describe('validateTelemetryErrorPayload', () => {
  it('should accept a valid payload', () => {
    expect(
      validateTelemetryErrorPayload({ device_id: 'dev', error: 'Timeout' })
    ).toBe(true);
  });

  it('should accept a payload with optional stack', () => {
    expect(
      validateTelemetryErrorPayload({
        device_id: 'dev',
        error: 'Timeout',
        stack: 'at relay.ts:42',
      })
    ).toBe(true);
  });

  it('should reject empty error', () => {
    expect(validateTelemetryErrorPayload({ device_id: 'dev', error: '' })).toBe(false);
  });

  it('should reject non-string stack', () => {
    expect(
      validateTelemetryErrorPayload({
        device_id: 'dev',
        error: 'Timeout',
        stack: 42 as unknown as string,
      })
    ).toBe(false);
  });
});
