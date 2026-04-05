import {
  createSensorDataEvent,
  createSensorAlertEvent,
  parseSensorDataPayload,
  parseSensorAlertPayload,
  validateSensorDataPayload,
  validateSensorAlertPayload,
  SensorDataPayload,
  SensorAlertPayload,
} from '@not/protocols/sensor';
import { EVENT_KINDS } from '@not/core/event';

const devicePubkey = 'a'.repeat(64);
const privateKey = 'b'.repeat(128);

describe('createSensorDataEvent', () => {
  const payload: SensorDataPayload = {
    sensor_id: 'temperature-1',
    readings: { temperature: 22.5, humidity: 60 },
    metadata: { unit: 'celsius', accuracy: 0.1, sample_rate: 1 },
  };

  it('should return an event with kind 30078', () => {
    const event = createSensorDataEvent(payload, devicePubkey, privateKey);
    expect(event.kind).toBe(EVENT_KINDS.SENSOR_DATA);
  });

  it('should set pubkey to devicePubkey', () => {
    const event = createSensorDataEvent(payload, devicePubkey, privateKey);
    expect(event.pubkey).toBe(devicePubkey);
  });

  it('should include the d tag with device:sensor format', () => {
    const event = createSensorDataEvent(payload, devicePubkey, privateKey);
    const dTag = event.tags.find((t) => t[0] === 'd');
    expect(dTag).toBeDefined();
    expect(dTag?.[1]).toBe(`${devicePubkey}:temperature-1`);
  });

  it('should include the t tag set to sensor.data', () => {
    const event = createSensorDataEvent(payload, devicePubkey, privateKey);
    const tTag = event.tags.find((t) => t[0] === 't');
    expect(tTag?.[1]).toBe('sensor.data');
  });

  it('should JSON-stringify the payload in content', () => {
    const event = createSensorDataEvent(payload, devicePubkey, privateKey);
    const parsed = JSON.parse(event.content) as SensorDataPayload;
    expect(parsed.sensor_id).toBe('temperature-1');
    expect(parsed.readings.temperature).toBe(22.5);
  });

  it('should include id and sig fields', () => {
    const event = createSensorDataEvent(payload, devicePubkey, privateKey);
    expect(typeof event.id).toBe('string');
    expect(typeof event.sig).toBe('string');
  });
});

describe('createSensorAlertEvent', () => {
  const payload: SensorAlertPayload = {
    sensor_id: 'smoke-1',
    message: 'Smoke detected above threshold',
    severity: 'critical',
  };

  it('should return an event with kind 30079', () => {
    const event = createSensorAlertEvent(payload, devicePubkey, privateKey);
    expect(event.kind).toBe(EVENT_KINDS.SENSOR_ALERT);
  });

  it('should include the severity tag', () => {
    const event = createSensorAlertEvent(payload, devicePubkey, privateKey);
    const severityTag = event.tags.find((t) => t[0] === 'severity');
    expect(severityTag?.[1]).toBe('critical');
  });

  it('should include the t tag set to sensor.alert', () => {
    const event = createSensorAlertEvent(payload, devicePubkey, privateKey);
    const tTag = event.tags.find((t) => t[0] === 't');
    expect(tTag?.[1]).toBe('sensor.alert');
  });
});

describe('parseSensorDataPayload', () => {
  it('should parse valid sensor data content', () => {
    const payload: SensorDataPayload = {
      sensor_id: 's1',
      readings: { co2: 400 },
    };
    const event = createSensorDataEvent(payload, devicePubkey, privateKey);
    const parsed = parseSensorDataPayload(event);
    expect(parsed.sensor_id).toBe('s1');
    expect(parsed.readings.co2).toBe(400);
  });
});

describe('parseSensorAlertPayload', () => {
  it('should parse valid sensor alert content', () => {
    const payload: SensorAlertPayload = {
      sensor_id: 's1',
      message: 'High temperature',
      severity: 'warning',
    };
    const event = createSensorAlertEvent(payload, devicePubkey, privateKey);
    const parsed = parseSensorAlertPayload(event);
    expect(parsed.severity).toBe('warning');
  });
});

describe('validateSensorDataPayload', () => {
  it('should accept a valid payload', () => {
    expect(
      validateSensorDataPayload({
        sensor_id: 'temp',
        readings: { temperature: 20 },
      })
    ).toBe(true);
  });

  it('should accept a payload with metadata', () => {
    expect(
      validateSensorDataPayload({
        sensor_id: 'temp',
        readings: { temperature: 20 },
        metadata: { unit: 'celsius', accuracy: 0.1, sample_rate: 1 },
      })
    ).toBe(true);
  });

  it('should reject empty sensor_id', () => {
    expect(
      validateSensorDataPayload({ sensor_id: '', readings: { temperature: 20 } })
    ).toBe(false);
  });

  it('should reject non-numeric reading values', () => {
    expect(
      validateSensorDataPayload({
        sensor_id: 'temp',
        readings: { temperature: 'hot' as unknown as number },
      })
    ).toBe(false);
  });

  it('should reject invalid metadata unit type', () => {
    expect(
      validateSensorDataPayload({
        sensor_id: 'temp',
        readings: { temperature: 20 },
        metadata: {
          unit: 123 as unknown as string,
          accuracy: 0.1,
          sample_rate: 1,
        },
      })
    ).toBe(false);
  });
});

describe('validateSensorAlertPayload', () => {
  it('should accept a valid payload', () => {
    expect(
      validateSensorAlertPayload({
        sensor_id: 'smoke',
        message: 'Alert!',
        severity: 'critical',
      })
    ).toBe(true);
  });

  it('should reject missing message', () => {
    expect(
      validateSensorAlertPayload({
        sensor_id: 'smoke',
        message: '',
        severity: 'info',
      })
    ).toBe(false);
  });

  it('should reject invalid severity', () => {
    expect(
      validateSensorAlertPayload({
        sensor_id: 'smoke',
        message: 'Alert',
        severity: 'fatal' as SensorAlertPayload['severity'],
      })
    ).toBe(false);
  });
});
