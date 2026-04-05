import { UserClient } from '@not/clients/user';
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
  tags: [['d', 'user:sensor1']],
  content: '{"readings":{}}',
  sig: 'f'.repeat(128),
};

const unsignedEvent: UnsignedEvent = {
  pubkey: TEST_PUBKEY,
  created_at: 1647884523,
  kind: 30078,
  tags: [['d', 'user:sensor1']],
  content: '{"readings":{}}',
};

// ---- Tests -------------------------------------------------------------------

describe('UserClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should throw when no relay URLs are configured', async () => {
      const client = new UserClient({ pubkey: TEST_PUBKEY });
      await expect(client.connect()).rejects.toThrow('no relay URLs configured');
    });

    it('should connect to all configured relays', async () => {
      const client = new UserClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();
      expect(mockConnect).toHaveBeenCalledTimes(2);
    });
  });

  describe('disconnect', () => {
    it('should disconnect all relay clients', async () => {
      const client = new UserClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      await client.disconnect();
      expect(mockDisconnect).toHaveBeenCalledTimes(2);
    });

    it('should be safe to call when not connected', async () => {
      const client = new UserClient({ pubkey: TEST_PUBKEY });
      await expect(client.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('send', () => {
    it('should throw when not connected', async () => {
      const client = new UserClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });

      await expect(client.send(signedEvent)).rejects.toThrow(
        'not connected to any relay'
      );
    });

    it('should publish a signed event to all relays', async () => {
      const client = new UserClient({
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
      const client = new UserClient({
        pubkey: TEST_PUBKEY,
        privateKey: TEST_PRIVATE_KEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      await client.send(unsignedEvent);
      expect(signEvent).toHaveBeenCalledWith(unsignedEvent, TEST_PRIVATE_KEY);
    });

    it('should throw when sending unsigned event without privateKey', async () => {
      const client = new UserClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      await expect(client.send(unsignedEvent)).rejects.toThrow(
        'privateKey is required'
      );
    });
  });

  describe('subscribe', () => {
    it('should subscribe without filters when no arguments are provided', async () => {
      const client = new UserClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      await client.subscribe();
      expect(mockSubscribe).toHaveBeenCalled();

      const filterArg = mockSubscribe.mock.calls[0] as unknown as [RelayFilter[], unknown];
      // When no npub is given, UserClient does NOT default to own pubkey (unlike DeviceClient)
      expect(filterArg[0][0].authors).toBeUndefined();
    });

    it('should subscribe filtering by author pubkey', async () => {
      const client = new UserClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      const devicePubkey = 'e'.repeat(64);
      await client.subscribe(devicePubkey);

      const filterArg = mockSubscribe.mock.calls[0] as unknown as [RelayFilter[], unknown];
      expect(filterArg[0][0].authors).toEqual([devicePubkey]);
    });

    it('should include since filter when provided', async () => {
      const client = new UserClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      await client.subscribe(undefined, 1647884500);

      const filterArg = mockSubscribe.mock.calls[0] as unknown as [RelayFilter[], unknown];
      expect(filterArg[0][0].since).toBe(1647884500);
    });
  });

  describe('subscribeKinds', () => {
    it('should subscribe to specific event kinds', async () => {
      const client = new UserClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      const onEvent = jest.fn();
      const subIds = client.subscribeKinds([30078, 30079], onEvent);

      expect(subIds).toHaveLength(2);
      const filterArg = mockSubscribe.mock.calls[0] as unknown as [RelayFilter[], unknown];
      expect(filterArg[0][0].kinds).toEqual([30078, 30079]);
    });

    it('should filter by authors when provided', async () => {
      const client = new UserClient({
        pubkey: TEST_PUBKEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      const onEvent = jest.fn();
      const authors = ['e'.repeat(64)];
      client.subscribeKinds([30078], onEvent, authors);

      const filterArg = mockSubscribe.mock.calls[0] as unknown as [RelayFilter[], unknown];
      expect(filterArg[0][0].authors).toEqual(authors);
    });
  });

  describe('subscribeFilters', () => {
    it('should forward custom filters to all relay clients', async () => {
      const client = new UserClient({
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
      const client = new UserClient({
        pubkey: TEST_PUBKEY,
        privateKey: TEST_PRIVATE_KEY,
        relays: RELAY_URLS,
      });
      await client.connect();

      await client.sendEvent(30081, '{"metric":"cpu"}', [['d', 'user:cpu']]);

      expect(createEventTemplate).toHaveBeenCalledWith(
        30081,
        TEST_PUBKEY,
        '{"metric":"cpu"}',
        [['d', 'user:cpu']]
      );
    });

    it('should throw when privateKey is missing', async () => {
      const client = new UserClient({
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
