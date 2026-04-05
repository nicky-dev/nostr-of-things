import {
  createDeviceCommandEvent,
  createDeviceStatusEvent,
  createDeviceEvent,
  parseDeviceEventPayload,
  validateDeviceCommandPayload,
  validateDeviceStatusPayload,
  validateDeviceEventPayload,
  DeviceCommandPayload,
  DeviceStatusPayload,
  DeviceEventPayload,
} from '@not/protocols/control';
import { EVENT_KINDS } from '@not/core/event';

const senderPubkey = 'a'.repeat(64);
const privateKey = 'b'.repeat(128);
const recipientBoxPublicKey = new Uint8Array(32).fill(6);

describe('createDeviceCommandEvent', () => {
  const payload: DeviceCommandPayload = {
    device_id: 'd'.repeat(64),
    command: 'reboot',
    parameters: { delay: 5 },
    timeout: 30,
  };

  it('should return an event with kind 4078', () => {
    const event = createDeviceCommandEvent(payload, senderPubkey, privateKey, recipientBoxPublicKey);
    expect(event.kind).toBe(EVENT_KINDS.DEVICE_CMD);
  });

  it('should include the p tag with device_id', () => {
    const event = createDeviceCommandEvent(payload, senderPubkey, privateKey, recipientBoxPublicKey);
    const pTag = event.tags.find((t) => t[0] === 'p');
    expect(pTag?.[1]).toBe(payload.device_id);
  });

  it('should include the t tag set to device.cmd', () => {
    const event = createDeviceCommandEvent(payload, senderPubkey, privateKey, recipientBoxPublicKey);
    const tTag = event.tags.find((t) => t[0] === 't');
    expect(tTag?.[1]).toBe('device.cmd');
  });

  it('should have encrypted content (not plain JSON)', () => {
    const event = createDeviceCommandEvent(payload, senderPubkey, privateKey, recipientBoxPublicKey);
    // Encrypted content should not be the plain payload
    expect(event.content).not.toBe(JSON.stringify(payload));
  });

  it('should include id and sig', () => {
    const event = createDeviceCommandEvent(payload, senderPubkey, privateKey, recipientBoxPublicKey);
    expect(typeof event.id).toBe('string');
    expect(typeof event.sig).toBe('string');
  });
});

describe('createDeviceStatusEvent', () => {
  const payload: DeviceStatusPayload = {
    device_id: 'd'.repeat(64),
    status: 'online',
    diagnostics: { uptime: 12345 },
  };

  it('should return an event with kind 4079', () => {
    const event = createDeviceStatusEvent(payload, senderPubkey, privateKey, recipientBoxPublicKey);
    expect(event.kind).toBe(EVENT_KINDS.DEVICE_STATUS);
  });

  it('should include the t tag set to device.status', () => {
    const event = createDeviceStatusEvent(payload, senderPubkey, privateKey, recipientBoxPublicKey);
    const tTag = event.tags.find((t) => t[0] === 't');
    expect(tTag?.[1]).toBe('device.status');
  });
});

describe('createDeviceEvent', () => {
  const payload: DeviceEventPayload = {
    device_id: 'dev-1',
    event_type: 'boot',
    data: { version: '1.0.0' },
  };

  it('should return an event with kind 30080', () => {
    const event = createDeviceEvent(payload, senderPubkey, privateKey);
    expect(event.kind).toBe(EVENT_KINDS.DEVICE_EVENT);
  });

  it('should include the d tag with device:event_type format', () => {
    const event = createDeviceEvent(payload, senderPubkey, privateKey);
    const dTag = event.tags.find((t) => t[0] === 'd');
    expect(dTag?.[1]).toBe(`${senderPubkey}:boot`);
  });

  it('should include the t tag set to device.event', () => {
    const event = createDeviceEvent(payload, senderPubkey, privateKey);
    const tTag = event.tags.find((t) => t[0] === 't');
    expect(tTag?.[1]).toBe('device.event');
  });

  it('should JSON-stringify the payload in content', () => {
    const event = createDeviceEvent(payload, senderPubkey, privateKey);
    const parsed = JSON.parse(event.content) as DeviceEventPayload;
    expect(parsed.event_type).toBe('boot');
  });
});

describe('parseDeviceEventPayload', () => {
  it('should parse a device.event content', () => {
    const payload: DeviceEventPayload = {
      device_id: 'dev-1',
      event_type: 'shutdown',
    };
    const event = createDeviceEvent(payload, senderPubkey, privateKey);
    const parsed = parseDeviceEventPayload(event);
    expect(parsed.event_type).toBe('shutdown');
  });
});

describe('validateDeviceCommandPayload', () => {
  it('should accept a valid payload', () => {
    expect(
      validateDeviceCommandPayload({ device_id: 'dev', command: 'reboot' })
    ).toBe(true);
  });

  it('should accept a payload with optional fields', () => {
    expect(
      validateDeviceCommandPayload({
        device_id: 'dev',
        command: 'reboot',
        parameters: { delay: 5 },
        timeout: 30,
      })
    ).toBe(true);
  });

  it('should reject empty device_id', () => {
    expect(validateDeviceCommandPayload({ device_id: '', command: 'reboot' })).toBe(false);
  });

  it('should reject empty command', () => {
    expect(validateDeviceCommandPayload({ device_id: 'dev', command: '' })).toBe(false);
  });

  it('should reject non-number timeout', () => {
    expect(
      validateDeviceCommandPayload({
        device_id: 'dev',
        command: 'reboot',
        timeout: '30' as unknown as number,
      })
    ).toBe(false);
  });
});

describe('validateDeviceStatusPayload', () => {
  it('should accept a valid payload', () => {
    expect(validateDeviceStatusPayload({ device_id: 'dev', status: 'online' })).toBe(true);
  });

  it('should reject empty status', () => {
    expect(validateDeviceStatusPayload({ device_id: 'dev', status: '' })).toBe(false);
  });
});

describe('validateDeviceEventPayload', () => {
  it('should accept a valid payload', () => {
    expect(
      validateDeviceEventPayload({ device_id: 'dev', event_type: 'boot' })
    ).toBe(true);
  });

  it('should reject empty event_type', () => {
    expect(
      validateDeviceEventPayload({ device_id: 'dev', event_type: '' })
    ).toBe(false);
  });
});
