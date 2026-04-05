import {
  EVENT_KINDS,
  serializeForHashing,
  computeEventId,
  createEventTemplate,
  validateEvent,
  NotEvent,
  UnsignedEvent,
} from '@not/core/event';

describe('EVENT_KINDS', () => {
  it('should define all required IoT event kinds', () => {
    expect(EVENT_KINDS.SENSOR_DATA).toBe(30078);
    expect(EVENT_KINDS.SENSOR_ALERT).toBe(30079);
    expect(EVENT_KINDS.DEVICE_CMD).toBe(4078);
    expect(EVENT_KINDS.DEVICE_STATUS).toBe(4079);
    expect(EVENT_KINDS.DEVICE_EVENT).toBe(30080);
    expect(EVENT_KINDS.TELEMETRY_METRIC).toBe(30081);
    expect(EVENT_KINDS.TELEMETRY_ERROR).toBe(30082);
  });
});

describe('serializeForHashing', () => {
  const event: UnsignedEvent = {
    pubkey: 'a'.repeat(64),
    created_at: 1647884523,
    kind: 30078,
    tags: [['d', 'abc:sensor1']],
    content: '{"readings":{}}',
  };

  it('should produce a JSON array starting with 0', () => {
    const serialized = serializeForHashing(event);
    const parsed = JSON.parse(serialized) as unknown[];
    expect(parsed[0]).toBe(0);
  });

  it('should include all required fields in canonical order', () => {
    const serialized = serializeForHashing(event);
    const parsed = JSON.parse(serialized) as unknown[];
    expect(parsed).toEqual([
      0,
      event.pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content,
    ]);
  });

  it('should be deterministic for the same input', () => {
    expect(serializeForHashing(event)).toBe(serializeForHashing(event));
  });
});

describe('computeEventId', () => {
  const event: UnsignedEvent = {
    pubkey: 'b'.repeat(64),
    created_at: 1647884523,
    kind: 30081,
    tags: [],
    content: '{}',
  };

  it('should return a 64-character lowercase hex string', () => {
    const id = computeEventId(event);
    expect(id).toHaveLength(64);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should be deterministic', () => {
    expect(computeEventId(event)).toBe(computeEventId(event));
  });

  it('should produce different IDs for different events', () => {
    const other: UnsignedEvent = { ...event, content: '{"different":true}' };
    expect(computeEventId(event)).not.toBe(computeEventId(other));
  });
});

describe('createEventTemplate', () => {
  it('should return an unsigned event with the correct fields', () => {
    const pubkey = 'c'.repeat(64);
    const template = createEventTemplate(30078, pubkey, '{}', [['d', 'x']]);

    expect(template.pubkey).toBe(pubkey);
    expect(template.kind).toBe(30078);
    expect(template.content).toBe('{}');
    expect(template.tags).toEqual([['d', 'x']]);
    expect(typeof template.created_at).toBe('number');
  });

  it('should lowercase the pubkey', () => {
    const template = createEventTemplate(30078, 'A'.repeat(64), '{}', []);
    expect(template.pubkey).toBe('a'.repeat(64));
  });

  it('should set created_at as a Unix seconds timestamp', () => {
    const before = Math.floor(Date.now() / 1000);
    const template = createEventTemplate(30078, 'd'.repeat(64), '{}', []);
    const after = Math.floor(Date.now() / 1000);
    expect(template.created_at).toBeGreaterThanOrEqual(before);
    expect(template.created_at).toBeLessThanOrEqual(after);
  });

  it('should not include id or sig fields', () => {
    const template = createEventTemplate(30078, 'd'.repeat(64), '{}', []);
    expect((template as NotEvent).id).toBeUndefined();
    expect((template as NotEvent).sig).toBeUndefined();
  });
});

describe('validateEvent', () => {
  const buildValidEvent = (): NotEvent => {
    const unsigned: UnsignedEvent = {
      pubkey: 'a'.repeat(64),
      created_at: 1647884523,
      kind: 30078,
      tags: [['d', 'abc:sensor1']],
      content: '{"readings":{}}',
    };
    const id = computeEventId(unsigned);
    return {
      ...unsigned,
      id,
      sig: 'f'.repeat(128),
    };
  };

  it('should accept a valid event', () => {
    expect(validateEvent(buildValidEvent())).toBe(true);
  });

  it('should reject event with wrong id length', () => {
    const event = { ...buildValidEvent(), id: 'short' };
    expect(validateEvent(event)).toBe(false);
  });

  it('should reject event with wrong pubkey length', () => {
    const event = buildValidEvent();
    expect(validateEvent({ ...event, pubkey: 'a'.repeat(32) })).toBe(false);
  });

  it('should reject event with uppercase pubkey', () => {
    const event = buildValidEvent();
    expect(validateEvent({ ...event, pubkey: 'A'.repeat(64) })).toBe(false);
  });

  it('should reject event with wrong sig length', () => {
    const event = buildValidEvent();
    expect(validateEvent({ ...event, sig: 'abc' })).toBe(false);
  });

  it('should reject event with tampered content', () => {
    const event = { ...buildValidEvent(), content: '{"tampered":true}' };
    expect(validateEvent(event)).toBe(false);
  });

  it('should reject event with non-integer created_at', () => {
    const event = buildValidEvent();
    expect(validateEvent({ ...event, created_at: 1.5 })).toBe(false);
  });
});
