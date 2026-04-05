import { RelayClient, RelayEoseCallback } from '@not/core/relay';
import { NotEvent } from '@not/core/event';

// --- WebSocket mock -----------------------------------------------------------

type WsHandler = ((...args: unknown[]) => void) | null;

class MockWebSocket {
  onopen: WsHandler = null;
  onerror: WsHandler = null;
  onclose: WsHandler = null;
  onmessage: WsHandler = null;
  sent: string[] = [];
  closed = false;

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    if (this.onclose) this.onclose();
  }

  /** Helper: simulate server opening the connection */
  simulateOpen(): void {
    if (this.onopen) this.onopen();
  }

  /** Helper: simulate server sending a message */
  simulateMessage(data: string): void {
    if (this.onmessage) this.onmessage({ data } as MessageEvent);
  }

  /** Helper: simulate a WebSocket error */
  simulateError(err: string): void {
    if (this.onerror) this.onerror(err);
  }
}

let lastMockWs: MockWebSocket;

// Patch global WebSocket for the entire test module
beforeAll(() => {
  (globalThis as Record<string, unknown>).WebSocket = jest.fn(() => {
    lastMockWs = new MockWebSocket();
    return lastMockWs;
  });
});

afterAll(() => {
  delete (globalThis as Record<string, unknown>).WebSocket;
});

// ---- Fixtures ----------------------------------------------------------------

const RELAY_URL = 'wss://relay.example.com';

const sampleEvent: NotEvent = {
  id: 'a'.repeat(64),
  pubkey: 'b'.repeat(64),
  created_at: 1647884523,
  kind: 30078,
  tags: [['d', 'test:sensor1']],
  content: '{"readings":{}}',
  sig: 'c'.repeat(128),
};

// ---- Tests -------------------------------------------------------------------

describe('RelayClient', () => {
  describe('constructor', () => {
    it('should initialise with disconnected status', () => {
      const relay = new RelayClient(RELAY_URL);
      expect(relay.getStatus()).toBe('disconnected');
      expect(relay.getUrl()).toBe(RELAY_URL);
    });
  });

  describe('connect', () => {
    it('should resolve when WebSocket opens', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;
      expect(relay.getStatus()).toBe('connected');
    });

    it('should return immediately when already connected', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      // Second call should resolve without creating a new socket
      await relay.connect();
      expect(relay.getStatus()).toBe('connected');
    });

    it('should reject when WebSocket errors during connect', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateError('connection refused');
      await expect(p).rejects.toThrow('WebSocket error');
      expect(relay.getStatus()).toBe('disconnected');
    });

    it('should re-send existing subscriptions after reconnect', async () => {
      const relay = new RelayClient(RELAY_URL);
      let p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      // Register a subscription while connected
      const onEvent = jest.fn();
      relay.subscribe([{ kinds: [30078] }], onEvent);

      // Disconnect & reconnect
      relay.disconnect();

      p = relay.connect();
      const reconnectedWs = lastMockWs;
      reconnectedWs.simulateOpen();
      await p;

      // The REQ for the subscription should have been re-sent
      const reqMessages = reconnectedWs.sent.filter((m) => JSON.parse(m)[0] === 'REQ');
      expect(reqMessages.length).toBe(1);
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket and set status to disconnected', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      relay.disconnect();
      expect(relay.getStatus()).toBe('disconnected');
    });

    it('should reject pending publishes on disconnect', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      const publishPromise = relay.publish(sampleEvent);
      relay.disconnect();
      await expect(publishPromise).rejects.toThrow();
    });

    it('should be safe to call when already disconnected', () => {
      const relay = new RelayClient(RELAY_URL);
      expect(() => relay.disconnect()).not.toThrow();
      expect(relay.getStatus()).toBe('disconnected');
    });
  });

  describe('publish', () => {
    it('should reject when not connected', async () => {
      const relay = new RelayClient(RELAY_URL);
      await expect(relay.publish(sampleEvent)).rejects.toThrow('Relay not connected');
    });

    it('should send EVENT message on the wire', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      const ws = lastMockWs;
      const pubPromise = relay.publish(sampleEvent);

      // Simulate relay OK
      ws.simulateMessage(JSON.stringify(['OK', sampleEvent.id, true]));
      const ok = await pubPromise;

      expect(ok).toBe(true);
      const eventMsg = ws.sent.find((m) => JSON.parse(m)[0] === 'EVENT');
      expect(eventMsg).toBeDefined();
      expect(JSON.parse(eventMsg!)[1]).toEqual(sampleEvent);
    });

    it('should reject when relay responds with OK false', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      const ws = lastMockWs;
      const pubPromise = relay.publish(sampleEvent);

      ws.simulateMessage(JSON.stringify(['OK', sampleEvent.id, false, 'rate-limited']));
      await expect(pubPromise).rejects.toThrow('rate-limited');
    });

    it('should reject on publish timeout', async () => {
      jest.useFakeTimers();
      const relay = new RelayClient(RELAY_URL, 500);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      const pubPromise = relay.publish(sampleEvent);
      jest.advanceTimersByTime(600);
      await expect(pubPromise).rejects.toThrow('Publish timed out');
      jest.useRealTimers();
    });
  });

  describe('subscribe', () => {
    it('should send REQ message when connected', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      const ws = lastMockWs;
      const onEvent = jest.fn();
      const subId = relay.subscribe([{ kinds: [30078] }], onEvent);

      const req = ws.sent.find((m) => JSON.parse(m)[0] === 'REQ');
      expect(req).toBeDefined();
      const parsed = JSON.parse(req!);
      expect(parsed[1]).toBe(subId);
      expect(parsed[2]).toEqual({ kinds: [30078] });
    });

    it('should queue subscription when not connected', () => {
      const relay = new RelayClient(RELAY_URL);
      const onEvent = jest.fn();
      const subId = relay.subscribe([{ authors: ['ab'.repeat(32)] }], onEvent);
      expect(typeof subId).toBe('string');
    });

    it('should deliver EVENT messages to the correct callback', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      const onEvent = jest.fn();
      const subId = relay.subscribe([{ kinds: [30078] }], onEvent);

      lastMockWs.simulateMessage(JSON.stringify(['EVENT', subId, sampleEvent]));
      expect(onEvent).toHaveBeenCalledWith(sampleEvent);
    });

    it('should invoke onEose callback when EOSE received', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      const onEvent = jest.fn();
      const onEose: RelayEoseCallback = jest.fn();
      const subId = relay.subscribe([{ kinds: [30078] }], onEvent, onEose);

      lastMockWs.simulateMessage(JSON.stringify(['EOSE', subId]));
      expect(onEose).toHaveBeenCalledWith(subId);
    });
  });

  describe('unsubscribe', () => {
    it('should send CLOSE message and stop delivering events', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      const ws = lastMockWs;
      const onEvent = jest.fn();
      const subId = relay.subscribe([{ kinds: [30078] }], onEvent);

      relay.unsubscribe(subId);

      const closeMsg = ws.sent.find((m) => JSON.parse(m)[0] === 'CLOSE');
      expect(closeMsg).toBeDefined();
      expect(JSON.parse(closeMsg!)[1]).toBe(subId);

      // Events for removed subscription should be ignored
      ws.simulateMessage(JSON.stringify(['EVENT', subId, sampleEvent]));
      expect(onEvent).not.toHaveBeenCalled();
    });

    it('should silently ignore unknown subscription IDs', () => {
      const relay = new RelayClient(RELAY_URL);
      expect(() => relay.unsubscribe('nonexistent')).not.toThrow();
    });
  });

  describe('handleMessage edge cases', () => {
    it('should ignore non-JSON messages', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      // Should not throw
      lastMockWs.simulateMessage('not json');
    });

    it('should ignore non-array messages', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      lastMockWs.simulateMessage(JSON.stringify({ type: 'EVENT' }));
    });

    it('should ignore arrays with non-string first element', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      lastMockWs.simulateMessage(JSON.stringify([42, 'a']));
    });

    it('should ignore OK with non-hex eventId', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      lastMockWs.simulateMessage(JSON.stringify(['OK', 'not-a-hex-id', true]));
    });

    it('should ignore NOTICE messages gracefully', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      lastMockWs.simulateMessage(JSON.stringify(['NOTICE', 'rate limited']));
    });

    it('should ignore EVENT with non-string subscription ID', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      lastMockWs.simulateMessage(JSON.stringify(['EVENT', 123, sampleEvent]));
    });
  });

  describe('connection lifecycle', () => {
    it('should reject all pending publishes when WebSocket closes unexpectedly', async () => {
      const relay = new RelayClient(RELAY_URL);
      const p = relay.connect();
      lastMockWs.simulateOpen();
      await p;

      const ws = lastMockWs;
      const pub1 = relay.publish(sampleEvent);
      const pub2 = relay.publish({ ...sampleEvent, id: 'd'.repeat(64) });

      // Simulate unexpected close
      ws.close();

      await expect(pub1).rejects.toThrow();
      await expect(pub2).rejects.toThrow();
    });
  });
});
