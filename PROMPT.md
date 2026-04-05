# NoT (Nostr of Things) - Development Prompt

## Project Overview

NoT is a decentralized IoT communication protocol built on Nostr, enabling peer-to-peer device communication without centralized servers.

## Core Concepts

### Nostr Protocol

Nostr (Notes and Other Stuff Transmitted) is a decentralized network protocol that enables:
- Pub-sub messaging
- Cryptographic key pairs for identity
- Event-based communication
- Relay-agnostic design

### NoT Extensions

NoT extends Nostr with:
- IoT-specific event types
- Sensor data protocols
- Device control commands
- Telemetry metrics

## Key Files

- `src/core/relay/` - Relay implementation
- `src/core/event/` - Event handling
- `src/core/encryption/` - Cryptography
- `src/clients/client.ts` - Base client
- `src/protocols/` - Protocol implementations
- `src/utils/nsec.ts` - Event signing

## Event Structure

```typescript
interface NotEvent {
  id: string;              // SHA256 hash of signed content
  pubkey: string;          // Public key (lowercase hex)
  created_at: number;      // Unix timestamp (seconds)
  tags: string[][];        // Tags array
  content: string;         // JSON payload
  sig: string;             // Event signature
}
```

## Sensor Events

```typescript
interface SensorEvent {
  sensor_id: string;
  type: 'data' | 'alert' | 'diagnostic';
  readings: Record<string, number>;
  metadata?: {
    unit: string;
    accuracy: number;
    sample_rate: number;
  };
}
```

## Control Events

```typescript
interface ControlEvent {
  device_id: string;
  command: string;
  parameters?: Record<string, any>;
  timeout?: number;
}
```

## Telemetry Events

```typescript
interface TelemetryEvent {
  device_id: string;
  metric: string;
  value: number;
  tags?: string[];
}
```

## Development Workflow

1. Write code in `src/`
2. Add tests in `tests/`
3. Run `npm run test`
4. Generate docs with `npm run docs:generate`
5. Commit with conventional commits

## Security Considerations

- All events must be signed
- Validate signatures before processing
- Never expose private keys
- Use AES-256-GCM for encryption
- Implement rate limiting

## Testing

```bash
npm test                    # Run tests
npm run test:coverage       # Coverage report
npm run lint                # Lint check
npm run typecheck           # TypeScript check
```

## Documentation

- API docs: `npm run docs:generate`
- Protocol specs: `docs/protocols/`
- Architecture: `ARCHITECTURE.md`
- Security: `SECURITY.md`

## Getting Started

```bash
git clone <repository>
cd not-project
npm install
npm run dev
```

## Community

- [Discord](https://discord.gg/not-protocol)
- [GitHub](https://github.com/your-username/not-project)
- [Documentation](https://docs.not-protocol.io)
