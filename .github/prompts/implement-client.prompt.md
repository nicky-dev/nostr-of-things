---
description: "Scaffold a new NoT client (DeviceClient or UserClient) extending NotClient with direct relay connection and all 4 abstract methods"
agent: "agent"
argument-hint: "device or user"
---

Implement a **${{ clientType }}Client** in `src/clients/` that extends `NotClient`.

## Base Class

Reference [src/clients/client.ts](../../src/clients/client.ts) for the abstract base:

```typescript
export abstract class NotClient {
  protected config: ClientConfig;  // { pubkey, privateKey?, relays?, timeout? }
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(event: NotEvent): Promise<string>;
  abstract subscribe(npub?: string, since?: string): Promise<void>;
}
```

## Architecture

Devices connect **directly** to Nostr relays via WebSocket — no gateway or bridge.

- `connect()` — open WebSocket connections to each relay in `config.relays`
- `disconnect()` — close all WebSocket connections gracefully
- `send(event)` — publish a signed `NotEvent` to connected relays (NIP-01 `EVENT` message)
- `subscribe(npub?, since?)` — send NIP-01 `REQ` with filters; handle incoming `EVENT` messages

## Client-Specific Behavior

### DeviceClient
- Lightweight, minimal resource footprint (suitable for embedded/constrained devices)
- Publishes sensor data (kind `30078`), alerts (kind `30079`), telemetry (kinds `30081`/`30082`)
- Subscribes to encrypted commands (kind `4078`) — must decrypt with NIP-04
- Sends encrypted status updates (kind `4079`)
- Supports offline event queuing when relay is unreachable

### UserClient
- Full-featured client for apps/dashboards
- Subscribes to sensor data, alerts, telemetry from devices
- Sends encrypted commands (kind `4078`) to devices — must encrypt with NIP-04
- Receives encrypted status (kind `4079`) — must decrypt with NIP-04

## Requirements

- Use `tweetnacl` for all crypto (not Node.js `crypto`)
- Timestamps in Unix **seconds** (`Math.floor(Date.now() / 1000)`)
- Public keys as **lowercase hex**
- Event `content` must be `JSON.stringify()`'d
- Sign all outgoing events (Ed25519 via tweetnacl)
- Validate signatures on all incoming events — reject invalid

## Output Files

Create in `src/clients/`:
- `{clientType}-client.ts` — the client implementation
- Update `index.ts` or create one to re-export

Create in `tests/unit/`:
- `{clientType}-client.test.ts` — unit tests (connection, send, subscribe, error handling)

Create in `tests/integration/`:
- `{clientType}-client.integration.test.ts` — integration test with real crypto (`jest.unmock('tweetnacl')`)

Run `pnpm run typecheck` after implementation to verify strict TypeScript compliance.
