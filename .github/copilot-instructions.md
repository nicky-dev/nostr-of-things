# Project Guidelines — NoT (Nostr of Things)

## Architecture

Decentralized IoT framework built on the Nostr protocol — **no gateway required**. Devices connect directly to Nostr relays using NIP-01/02/04. Three layers:

- **Core** (`src/core/`): Relay communication (NIP-01/02/04), event handling, encryption (Ed25519 + AES-256-GCM)
- **Clients** (`src/clients/`): Abstract `NotClient` base with Device and User variants — extend and implement the 4 abstract methods (`connect`, `disconnect`, `send`, `subscribe`)
- **Protocols** (`src/protocols/`): Sensor, Control, Telemetry — follow the Define → Serialize → Validate pattern

**Network topology**: Device → Nostr Relay ← User (peer-to-peer, no intermediary)

See [ARCHITECTURE.md](ARCHITECTURE.md) for component boundaries and data flow.

## Build and Test

```bash
pnpm install          # Install dependencies (pnpm workspace)
pnpm run build        # TypeScript compilation
pnpm run dev          # Dev server with ts-node-dev
pnpm test             # Jest (ts-jest, >80% coverage target)
pnpm run lint         # ESLint
pnpm run format       # Prettier
pnpm run typecheck    # Strict TypeScript validation
```

## Code Style

- 2-space indentation, 100-char line limit
- Strict TypeScript — no `any` types
- Path aliases: `@not/core`, `@not/clients`, `@not/protocols`

## Conventions

- **Commits**: Conventional format — `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- **Timestamps**: Unix seconds (not milliseconds)
- **Public keys**: Always lowercase hex
- **Event content**: Always JSON-stringified before sending
- **Crypto**: Uses `tweetnacl` (not Node crypto) — lightweight, browser-compatible
- **NIP compliance**: NIP-01 (events), NIP-02 (pubkeys), NIP-04 (encryption) — deviations require justification

## Custom IoT Event Kinds (NIP-XX-IoT)

NoT defines custom event kinds in the reserved range for IoT communication:

| Kind    | Type               | Description                        |
|---------|--------------------|------------------------------------|
| `30078` | `sensor.data`      | Sensor readings (parameterized replaceable) |
| `30079` | `sensor.alert`     | Alert message + severity           |
| `4078`  | `device.cmd`       | Encrypted device command + params  |
| `4079`  | `device.status`    | Encrypted status + diagnostics     |
| `30080` | `device.event`     | General device event data          |
| `30081` | `telemetry.metric` | Metric name + value                |
| `30082` | `telemetry.error`  | Error + stack trace                |

- Kinds `4078`-`4079` use NIP-04 encryption (commands/status are sensitive)
- Kinds `30078`-`30082` are parameterized replaceable events (latest reading replaces previous)
- Tag `d` = `{device_pubkey}:{sensor_id}` for addressability
- Tag `t` = event type (e.g., `sensor.data`, `device.cmd`)
- All payloads are JSON-stringified in the `content` field

## Testing

- Unit tests in `tests/unit/`, integration in `tests/integration/`
- `tweetnacl` is mocked in `tests/setup.ts` — verify real crypto behavior in integration tests
- 10-second default timeout

See [tests/README.md](tests/README.md) for patterns and conventions.

## Security

- Event signature validation is mandatory — never skip
- Never expose private keys in logs or error messages
- Use constant-time comparisons for cryptographic operations
- Rate limiting and NIP-05 verification for relay connections

See [SECURITY.md](SECURITY.md) for the full security model.

## Documentation

- API docs: `docs/api/` (to be generated)
- Protocol specs: `docs/protocols/` (to be generated)
- Setup guide: [docs/SETUP.md](docs/SETUP.md)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
