/**
 * Core Relay Module — NIP-01 WebSocket relay client
 *
 * Handles publishing events and subscribing to filters via Nostr relay protocol.
 */

import { NotEvent } from '../event';

export interface RelayFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  '#e'?: string[];
  '#p'?: string[];
  since?: number;
  until?: number;
  limit?: number;
}

export type RelayEventCallback = (event: NotEvent) => void;
export type RelayEoseCallback = (subscriptionId: string) => void;

export type RelayStatus = 'connecting' | 'connected' | 'disconnecting' | 'disconnected';

interface Subscription {
  filters: RelayFilter[];
  onEvent: RelayEventCallback;
  onEose?: RelayEoseCallback;
}

/**
 * RelayClient — manages a single WebSocket connection to a Nostr relay.
 *
 * Usage:
 *   const relay = new RelayClient('wss://relay.example.com');
 *   await relay.connect();
 *   const subId = relay.subscribe([{ kinds: [30078], authors: ['<pubkey>'] }], onEvent);
 *   await relay.publish(event);
 *   relay.unsubscribe(subId);
 *   relay.disconnect();
 */
export class RelayClient {
  private url: string;
  private ws: WebSocket | null = null;
  private status: RelayStatus = 'disconnected';
  private subscriptions = new Map<string, Subscription>();
  private pendingPublish = new Map<string, (ok: boolean, message?: string) => void>();

  constructor(url: string) {
    this.url = url;
  }

  getStatus(): RelayStatus {
    return this.status;
  }

  getUrl(): string {
    return this.url;
  }

  /**
   * Open the WebSocket connection and wait for it to be ready.
   */
  connect(): Promise<void> {
    if (this.status === 'connected') return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.status = 'connecting';
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.status = 'connected';
        // Re-send active subscriptions after reconnect
        for (const [id, sub] of this.subscriptions) {
          this.sendSubscription(id, sub.filters);
        }
        resolve();
      };

      this.ws.onerror = (err) => {
        this.status = 'disconnected';
        reject(new Error(`WebSocket error connecting to ${this.url}: ${String(err)}`));
      };

      this.ws.onclose = () => {
        this.status = 'disconnected';
      };

      this.ws.onmessage = (msg: MessageEvent) => {
        this.handleMessage(msg.data);
      };
    });
  }

  /**
   * Close the WebSocket connection.
   */
  disconnect(): void {
    if (this.ws) {
      this.status = 'disconnecting';
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
  }

  /**
   * Publish a signed event to the relay.
   * Resolves with true on OK, rejects on failure.
   */
  publish(event: NotEvent): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.status !== 'connected') {
        reject(new Error('Relay not connected'));
        return;
      }

      this.pendingPublish.set(event.id, (ok, message) => {
        if (ok) {
          resolve(true);
        } else {
          reject(new Error(message ?? 'Relay rejected event'));
        }
      });

      this.ws.send(JSON.stringify(['EVENT', event]));
    });
  }

  /**
   * Subscribe to events matching the given filters.
   * Returns the subscription ID (use it to unsubscribe later).
   */
  subscribe(
    filters: RelayFilter[],
    onEvent: RelayEventCallback,
    onEose?: RelayEoseCallback
  ): string {
    const id = generateSubscriptionId();
    const sub: Subscription = { filters, onEvent, onEose };
    this.subscriptions.set(id, sub);

    if (this.ws && this.status === 'connected') {
      this.sendSubscription(id, filters);
    }

    return id;
  }

  /**
   * Cancel an active subscription.
   */
  unsubscribe(subscriptionId: string): void {
    if (this.subscriptions.has(subscriptionId)) {
      this.subscriptions.delete(subscriptionId);
      if (this.ws && this.status === 'connected') {
        this.ws.send(JSON.stringify(['CLOSE', subscriptionId]));
      }
    }
  }

  private sendSubscription(id: string, filters: RelayFilter[]): void {
    if (this.ws) {
      this.ws.send(JSON.stringify(['REQ', id, ...filters]));
    }
  }

  private handleMessage(data: string): void {
    let msg: unknown;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    if (!Array.isArray(msg) || msg.length < 2) return;
    const [type] = msg as [string, ...unknown[]];
    if (typeof type !== 'string') return;

    if (type === 'EVENT' && msg.length >= 3) {
      const subscriptionId = msg[1];
      if (typeof subscriptionId !== 'string') return;
      const event = msg[2] as NotEvent;
      const sub = this.subscriptions.get(subscriptionId);
      if (sub) {
        sub.onEvent(event);
      }
    } else if (type === 'EOSE' && msg.length >= 2) {
      const subscriptionId = msg[1];
      if (typeof subscriptionId !== 'string') return;
      const sub = this.subscriptions.get(subscriptionId);
      if (sub?.onEose) {
        sub.onEose(subscriptionId);
      }
    } else if (type === 'OK' && msg.length >= 3) {
      const eventId = msg[1];
      // Validate eventId is a 64-char hex string (NIP-01 event ID format)
      if (typeof eventId !== 'string' || !/^[0-9a-f]{64}$/.test(eventId)) return;
      const ok = msg[2] as boolean;
      const message = msg[3] as string | undefined;
      const cb = this.pendingPublish.get(eventId);
      if (cb) {
        this.pendingPublish.delete(eventId);
        cb(ok, message);
      }
    } else if (type === 'NOTICE' && msg.length >= 2) {
      // Relay notice — intentionally not logged in production
    }
  }
}

function generateSubscriptionId(): string {
  return Math.random().toString(36).slice(2, 12);
}
