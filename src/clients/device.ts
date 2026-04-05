/**
 * Device Client — lightweight Nostr client for IoT devices
 *
 * Connects directly to Nostr relays. No gateway or broker required.
 * Supports offline event queuing when the relay connection is unavailable.
 */

import { NotClient, ClientConfig, NotEvent } from './client';
import { RelayClient, RelayFilter, RelayEventCallback } from '../core/relay';
import { signEvent } from '../utils/nsec';
import { createEventTemplate } from '../core/event';

export class DeviceClient extends NotClient {
  private relayClients: RelayClient[] = [];
  private eventQueue: NotEvent[] = [];
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
      throw new Error('DeviceClient: no relay URLs configured');
    }

    this.relayClients = relays.map((url) => new RelayClient(url));

    await Promise.all(this.relayClients.map((r) => r.connect()));
    this.connected = true;

    // Flush any events that were queued while disconnected
    await this.flushQueue();
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
   * If not connected, the event is queued for delivery on reconnect.
   *
   * @returns The event ID
   */
  async send(event: NotEvent): Promise<string> {
    let signed = event;

    // Auto-sign if privateKey is available and event has no signature
    if (!event.sig && this.config.privateKey) {
      const { sig: _sig, id: _id, ...unsigned } = event;
      void _sig;
      void _id;
      signed = signEvent(unsigned, this.config.privateKey);
    }

    if (!this.connected) {
      this.eventQueue.push(signed);
      return signed.id;
    }

    await this.publishToRelays(signed);
    return signed.id;
  }

  /**
   * Subscribe to events from a specific author (by pubkey) across all relays.
   *
   * @param npub - Author's public key (hex). Defaults to this device's pubkey.
   * @param since - Unix timestamp to filter events from
   */
  async subscribe(npub?: string, since?: number): Promise<void> {
    const author = npub ?? this.config.pubkey;
    const filter: RelayFilter = {
      authors: [author],
      ...(since !== undefined ? { since } : {}),
    };

    for (const relay of this.relayClients) {
      relay.subscribe([filter], this.onEvent.bind(this));
    }
  }

  /**
   * Subscribe with custom filters and a callback.
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
      throw new Error('DeviceClient: privateKey is required to send events');
    }

    const unsigned = createEventTemplate(kind, this.config.pubkey, content, tags);
    const signed = signEvent(unsigned, this.config.privateKey);
    return this.send(signed);
  }

  private onEvent(event: NotEvent): void {
    // Subclasses can override; default is a no-op (events handled via subscribeFilters callback)
    void event;
  }

  private async publishToRelays(event: NotEvent): Promise<void> {
    await Promise.allSettled(this.relayClients.map((r) => r.publish(event)));
  }

  private async flushQueue(): Promise<void> {
    const queued = this.eventQueue.splice(0);
    for (const event of queued) {
      await this.publishToRelays(event);
    }
  }
}
