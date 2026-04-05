/**
 * Base Client for NoT
 * Extends this for device or user client implementations
 * Devices connect directly to Nostr relays — no gateway required
 */

import type { NotEvent, UnsignedEvent } from '../core/event';
export type { NotEvent, UnsignedEvent } from '../core/event';

/** An event that may or may not yet be signed */
export type MaybeSignedEvent = UnsignedEvent | NotEvent;

export interface ClientConfig {
  /** Ed25519 public key — 32 bytes as lowercase hex */
  pubkey: string;
  /** Ed25519 secret key — 64 bytes as hex (required for signing/encryption) */
  privateKey?: string;
  /** X25519 public key — 32 bytes as hex (required for receiving encrypted messages) */
  boxPublicKey?: string;
  /** Relay URLs to connect to */
  relays?: string[];
  /** Connection timeout in milliseconds */
  timeout?: number;
}

export abstract class NotClient {
  protected config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  /** Send a signed or unsigned event. Unsigned events are auto-signed when privateKey is set. */
  abstract send(event: MaybeSignedEvent): Promise<string>;
  abstract subscribe(npub?: string, since?: number): Promise<void>;
}
