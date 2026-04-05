/**
 * Control Protocol — kinds 4078 (device.cmd), 4079 (device.status), 30080 (device.event)
 *
 * Command and status events (kinds 4078/4079) use NIP-04-like encryption.
 * Device events (kind 30080) are unencrypted parameterized replaceable events.
 */

import { EVENT_KINDS, createEventTemplate, NotEvent, UnsignedEvent } from '../../core/event';
import { signEvent } from '../../utils/nsec';
import { encryptContent, decryptContent, deriveBoxPublicKey } from '../../core/encryption';

// ─── Payload types ────────────────────────────────────────────────────────────

export interface DeviceCommandPayload {
  device_id: string;
  command: string;
  parameters?: Record<string, unknown>;
  timeout?: number;
}

export interface DeviceStatusPayload {
  device_id: string;
  status: string;
  diagnostics?: Record<string, unknown>;
}

export interface DeviceEventPayload {
  device_id: string;
  event_type: string;
  data?: Record<string, unknown>;
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Build the encrypted content and tags shared by device.cmd and device.status events.
 */
function buildEncryptedEventParts(
  payload: DeviceCommandPayload | DeviceStatusPayload,
  eventType: string,
  recipientDeviceId: string,
  senderPrivateKey: string,
  recipientBoxPublicKey: Uint8Array
): { encryptedContent: string; tags: string[][] } {
  const senderSecretKeyBytes = Buffer.from(senderPrivateKey, 'hex');
  const senderBoxPublicKey = deriveBoxPublicKey(senderSecretKeyBytes);
  const encryptedContent = encryptContent(
    JSON.stringify(payload),
    senderSecretKeyBytes,
    recipientBoxPublicKey
  );
  const tags: string[][] = [
    ['t', eventType],
    ['p', recipientDeviceId],
    ['box', Buffer.from(senderBoxPublicKey).toString('hex')],
  ];
  return { encryptedContent, tags };
}

/**
 * Create a signed and encrypted device.cmd event (kind 4078).
 *
 * @param payload - Command payload
 * @param senderPubkey - Sender's public key (hex)
 * @param senderPrivateKey - Sender's Ed25519 secret key (hex)
 * @param recipientBoxPublicKey - Recipient's X25519 public key (32 bytes)
 */
export function createDeviceCommandEvent(
  payload: DeviceCommandPayload,
  senderPubkey: string,
  senderPrivateKey: string,
  recipientBoxPublicKey: Uint8Array
): NotEvent {
  const { encryptedContent, tags } = buildEncryptedEventParts(
    payload,
    'device.cmd',
    payload.device_id,
    senderPrivateKey,
    recipientBoxPublicKey
  );

  const unsigned: UnsignedEvent = createEventTemplate(
    EVENT_KINDS.DEVICE_CMD,
    senderPubkey,
    encryptedContent,
    tags
  );

  return signEvent(unsigned, senderPrivateKey);
}

/**
 * Create a signed and encrypted device.status event (kind 4079).
 *
 * @param payload - Status payload
 * @param senderPubkey - Sender's public key (hex)
 * @param senderPrivateKey - Sender's Ed25519 secret key (hex)
 * @param recipientBoxPublicKey - Recipient's X25519 public key (32 bytes)
 */
export function createDeviceStatusEvent(
  payload: DeviceStatusPayload,
  senderPubkey: string,
  senderPrivateKey: string,
  recipientBoxPublicKey: Uint8Array
): NotEvent {
  const { encryptedContent, tags } = buildEncryptedEventParts(
    payload,
    'device.status',
    payload.device_id,
    senderPrivateKey,
    recipientBoxPublicKey
  );

  const unsigned: UnsignedEvent = createEventTemplate(
    EVENT_KINDS.DEVICE_STATUS,
    senderPubkey,
    encryptedContent,
    tags
  );

  return signEvent(unsigned, senderPrivateKey);
}

/**
 * Create a signed device.event (kind 30080) — unencrypted general device event.
 */
export function createDeviceEvent(
  payload: DeviceEventPayload,
  devicePubkey: string,
  privateKey: string
): NotEvent {
  const dTag = `${devicePubkey}:${payload.event_type}`;
  const tags: string[][] = [
    ['d', dTag],
    ['t', 'device.event'],
  ];

  const unsigned: UnsignedEvent = createEventTemplate(
    EVENT_KINDS.DEVICE_EVENT,
    devicePubkey,
    JSON.stringify(payload),
    tags
  );

  return signEvent(unsigned, privateKey);
}

// ─── Decryption ───────────────────────────────────────────────────────────────

/**
 * Decrypt a device.cmd or device.status event content.
 *
 * The event must contain a `box` tag carrying the sender's X25519 public key
 * (added automatically by createDeviceCommandEvent / createDeviceStatusEvent).
 *
 * @param event - The encrypted event
 * @param recipientPrivateKey - Recipient's Ed25519 secret key (hex)
 * @returns Decrypted payload string
 */
export function decryptEventContent(
  event: NotEvent,
  recipientPrivateKey: string
): string {
  const boxTag = event.tags.find((t) => t[0] === 'box');
  if (!boxTag || !boxTag[1]) {
    throw new Error('decryptEventContent: event is missing the "box" tag (sender box public key)');
  }
  const senderBoxPublicKey = Buffer.from(boxTag[1], 'hex');
  const recipientSecretKeyBytes = Buffer.from(recipientPrivateKey, 'hex');
  return decryptContent(event.content, recipientSecretKeyBytes, senderBoxPublicKey);
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Parse a decrypted device command payload.
 */
export function parseDeviceCommandPayload(decrypted: string): DeviceCommandPayload {
  return JSON.parse(decrypted) as DeviceCommandPayload;
}

/**
 * Parse a decrypted device status payload.
 */
export function parseDeviceStatusPayload(decrypted: string): DeviceStatusPayload {
  return JSON.parse(decrypted) as DeviceStatusPayload;
}

/**
 * Parse the content field of a device.event.
 */
export function parseDeviceEventPayload(event: NotEvent): DeviceEventPayload {
  return JSON.parse(event.content) as DeviceEventPayload;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a device command payload.
 */
export function validateDeviceCommandPayload(payload: DeviceCommandPayload): boolean {
  if (typeof payload.device_id !== 'string' || payload.device_id.length === 0) return false;
  if (typeof payload.command !== 'string' || payload.command.length === 0) return false;
  if (payload.timeout !== undefined && typeof payload.timeout !== 'number') return false;
  return true;
}

/**
 * Validate a device status payload.
 */
export function validateDeviceStatusPayload(payload: DeviceStatusPayload): boolean {
  if (typeof payload.device_id !== 'string' || payload.device_id.length === 0) return false;
  if (typeof payload.status !== 'string' || payload.status.length === 0) return false;
  return true;
}

/**
 * Validate a device event payload.
 */
export function validateDeviceEventPayload(payload: DeviceEventPayload): boolean {
  if (typeof payload.device_id !== 'string' || payload.device_id.length === 0) return false;
  if (typeof payload.event_type !== 'string' || payload.event_type.length === 0) return false;
  return true;
}
