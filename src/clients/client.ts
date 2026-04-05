/**
 * Base Client for NoT
 * Extends this for device or user client implementations
 * Devices connect directly to Nostr relays — no gateway required
 */

export interface ClientConfig {
  pubkey: string;
  privateKey?: string;
  relays?: string[];
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
  abstract subscribe(npub?: string, since?: string): Promise<void>;
}

export interface NotEvent {
  id: string;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
  sig: string;
}
