/**
 * Base Client for NoT
 * Extends this for device or user client implementations
 * Devices connect directly to Nostr relays — no gateway required
 */

import type { NotEvent } from '../core/event';
export type { NotEvent } from '../core/event';

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
  abstract send(event: NotEvent): Promise<string>;
  abstract subscribe(npub?: string, since?: number): Promise<void>;
}
