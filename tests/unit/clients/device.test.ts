import { DeviceClient } from '@not/clients/device';
import { NotEvent, UnsignedEvent } from '@not/core/event';
import type { RelayFilter } from '@not/core/relay';

// --- Mocks --------------------------------------------------------------------

const mockConnect = jest.fn(() => Promise.resolve());
const mockDisconnect = jest.fn();
const mockPublish = jest.fn(() => Promise.resolve(true));
const mockSubscribe = jest.fn(() => 'sub-id-1');

jest.mock('@not/core/relay', () => ({
  RelayClient: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    publish: mockPublish,
    subscribe: mockSubscribe,
  })),
}));

jest.mock('@not/utils/nsec', () => ({
  signEvent: jest.fn((event: UnsignedEvent) => ({
    ...event,
    id: 'a'.repeat(64),
    sig: 'b'.repeat(128),
  })),
}));

jest.mock('@not/core/event', () => ({
  createEventTemplate: jest.fn(
    (kind: number, pubkey: string, content: string, tags: string[][]) => ({
      pubkey: pubkey.toLowerCase(),
      created_at: 1647884523,
      kind,
      tags,
      content,
    })
  ),
}));

// ---- Fixtures ----------------------------------------------------------------

const TEST_PUBKEY = 'c'.repeat(64);
const TEST_PRIVATE_KEY = 'd'.repeat(128);
const RELAY_URLS = ['wss://relay1.example.com', 'wss://relay2.example.com'];

const signedEvent: NotEvent = {
  id: 'a'.repeat(64),
  pubkey: TEST_PUBKEY,
  created_at: 1647884523,
  kind: 30078,
  tags: [['d', 'dev:sensor1']],
  content: '{"readings":{}}',
  sig: 'f'.repeat(128),
};

const unsignedEvent: UnsignedEvent = {
  pubkey: TEST_PUBKEY,
  created_at: 1647884523,
  kind: 30078,
  tags: [['d', 'dev:sensor1']],
  content: '{"readings":{}}',
};

// ---- Tests -------------------------------------------------------------------

describe('DeviceClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should throw when no relay URLs are configured', async () => {
      const client = new DeviceClient({ pubkey: TEST_PUBKEY });
      await expect(client.connect()).rejects.toThrow('no relay URLs configured');
    });

    it('should connect to all configured relays', async () => {
      const client = new DeviceClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();
      expect(mockConnect).toHaveBeenCalledTimes(2);
    });

    it('should flush queued events after reconnect', async () => {
      const client = new DeviceClient({
        pubkey: TEST_PUBKEY,
        privateKey: TEST_PRIVATE_KEY,
        relays: RELAY_URLS,
      });

      // Queue an event while disconnected
      const id = await client.send(unsignedEvent);
      expect(typeof id).toBe('string');
      expect(mockPublish).not.toHaveBeenCalled();

      // Now connect — queued events should flush
      await client.connect();
      expect(mockPublish).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect all relay clients', async () => {
      const client = new DeviceClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      await client.disconnect();
      expect(mockDisconnect).toHaveBeenCalledTimes(2);
    });

    it('should be safe to call when not connected', async () => {
      const client = new DeviceClient({ pubkey: TEST_PUBKEY });
      await expect(client.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('send', () => {
    it('should publish a signed event to all relays', async () => {
      const client = new DeviceClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      const id = await client.send(signedEvent);
      expect(id).toBe(signedEvent.id);
      expect(mockPublish).toHaveBeenCalledWith(signedEvent);
    });

    it('should auto-sign unsigned events when privateKey is set', async () => {
      const { signEvent } = jest.requireMock('@not/utils/nsec') as {
        signEvent: jest.Mock;
      };
      const client = new DeviceClient({
        pubkey: TEST_PUBKEY,
        privateKey: TEST_PRIVATE_KEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      await client.send(unsignedEvent);
      expect(signEvent).toHaveBeenCalledWith(unsignedEvent, TEST_PRIVATE_KEY);
    });

    it('should throw when sending unsigned event without privateKey', async () => {
      const client = new DeviceClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      await expect(client.send(unsignedEvent)).rejects.toThrow(
        'privateKey is required'
      );
    });

    it('should queue events when not connected', async () => {
      const client = new DeviceClient({
        pubkey: TEST_PUBKEY,
        privateKey: TEST_PRIVATE_KEY,
      });

      const id = await client.send(signedEvent);
      expect(id).toBe(signedEvent.id);
      expect(mockPublish).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should subscribe to events from own pubkey by default', async () => {
      const client = new DeviceClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      await client.subscribe();
      expect(mockSubscribe).toHaveBeenCalled();

      const filterArg = mockSubscribe.mock.calls[0] as unknown as [RelayFilter[], unknown];
      expect(filterArg[0][0].authors).toEqual([TEST_PUBKEY]);
    });

    it('should subscribe to events from a specific author', async () => {
      const client = new DeviceClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      const otherPubkey = 'e'.repeat(64);
      await client.subscribe(otherPubkey);

      const filterArg = mockSubscribe.mock.calls[0] as unknown as [RelayFilter[], unknown];
      expect(filterArg[0][0].authors).toEqual([otherPubkey]);
    });

    it('should include since filter when provided', async () => {
      const client = new DeviceClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      await client.subscribe(undefined, 1647884500);

      const filterArg = mockSubscribe.mock.calls[0] as unknown as [RelayFilter[], unknown];
      expect(filterArg[0][0].since).toBe(1647884500);
    });
  });

  describe('subscribeFilters', () => {
    it('should forward custom filters to all relay clients', async () => {
      const client = new DeviceClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      const onEvent = jest.fn();
      const filters: RelayFilter[] = [{ kinds: [30078], limit: 10 }];
      const subIds = client.subscribeFilters(filters, onEvent);

      expect(subIds).toHaveLength(2);
      expect(mockSubscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendEvent', () => {
    it('should create, sign, and send an event', async () => {
      const { createEventTemplate } = jest.requireMock('@not/core/event') as {
        createEventTemplate: jest.Mock;
      };
      const client = new DeviceClient({
        pubkey: TEST_PUBKEY,
        privateKey: TEST_PRIVATE_KEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      await client.sendEvent(30078, '{"temp":22}', [['d', 'dev:sensor']]);

      expect(createEventTemplate).toHaveBeenCalledWith(
        30078,
        TEST_PUBKEY,
        '{"temp":22}',
        [['d', 'dev:sensor']]
      );
    });

    it('should throw when privateKey is missing', async () => {
      const client = new DeviceClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      await expect(
        client.sendEvent(30078, '{}', [])
      ).rejects.toThrow('privateKey is required');
    });
  });
});
