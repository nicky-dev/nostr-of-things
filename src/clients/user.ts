/**
 * User Client — full-featured Nostr client for user-facing applications
 *
 * Connects to one or more relays and enables subscribing to device events,
 * sending commands, and receiving telemetry.
 */

import { NotClient, ClientConfig, NotEvent } from './client';
import { RelayClient, RelayFilter, RelayEventCallback } from '../core/relay';
import { signEvent } from '../utils/nsec';
import { createEventTemplate } from '../core/event';

export class UserClient extends NotClient {
  private relayClients: RelayClient[] = [];
  private connected = false;

  constructor(config: ClientConfig) {
    super(config);
  }

  /**
   * Connect to all configured relay URLs.
   */
  async connect(): Promise<void> {
    const relays = this.config.relays ?? [];
    if (relays.length === 0) {
      throw new Error('UserClient: no relay URLs configured');
    }

    this.relayClients = relays.map((url) => new RelayClient(url));
    await Promise.all(this.relayClients.map((r) => r.connect()));
    this.connected = true;
  }

  /**
   * Disconnect from all relays.
   */
  async disconnect(): Promise<void> {
    for (const relay of this.relayClients) {
      relay.disconnect();
    }
    this.relayClients = [];
    this.connected = false;
  }

  /**
   * Sign and publish an event to all connected relays.
   *
   * @returns The event ID
   */
  async send(event: NotEvent): Promise<string> {
    if (!this.connected) {
      throw new Error('UserClient: not connected to any relay');
    }

    let signed = event;
    if (!event.sig && this.config.privateKey) {
      const { sig: _sig, id: _id, ...unsigned } = event;
      void _sig;
      void _id;
      signed = signEvent(unsigned, this.config.privateKey);
    }

    await Promise.allSettled(this.relayClients.map((r) => r.publish(signed)));
    return signed.id;
  }

  /**
   * Subscribe to events from a specific author across all connected relays.
   *
   * @param npub - Author's public key (hex)
   * @param since - Unix timestamp to filter events from
   */
  async subscribe(npub?: string, since?: number): Promise<void> {
    const filter: RelayFilter = {
      ...(npub ? { authors: [npub] } : {}),
      ...(since !== undefined ? { since } : {}),
    };

    for (const relay of this.relayClients) {
      relay.subscribe([filter], this.onEvent.bind(this));
    }
  }

  /**
   * Subscribe to specific event kinds with a callback.
   */
  subscribeKinds(
    kinds: number[],
    onEvent: RelayEventCallback,
    authors?: string[]
  ): string[] {
    const filter: RelayFilter = {
      kinds,
      ...(authors ? { authors } : {}),
    };
    return this.relayClients.map((relay) => relay.subscribe([filter], onEvent));
  }

  /**
   * Subscribe with fully custom filters.
   */
  subscribeFilters(filters: RelayFilter[], onEvent: RelayEventCallback): string[] {
    return this.relayClients.map((relay) => relay.subscribe(filters, onEvent));
  }

  /**
   * Create and send a typed IoT event.
   */
  async sendEvent(
    kind: number,
    content: string,
    tags: string[][]
  ): Promise<string> {
    if (!this.config.privateKey) {
      throw new Error('UserClient: privateKey is required to send events');
    }

    const unsigned = createEventTemplate(kind, this.config.pubkey, content, tags);
    const signed = signEvent(unsigned, this.config.privateKey);
    return this.send(signed);
  }

  private onEvent(event: NotEvent): void {
    // Default handler — subclasses can override
    void event;
  }
}
