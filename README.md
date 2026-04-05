# NoT (Nostr of Things)

> Decentralized IoT (Internet of Things) network using Nostr protocol

## What is NoT?

NoT is a decentralized IoT communication protocol built on Nostr (Notes and Other Stuff Transmitted) protocol, enabling peer-to-peer device communication without centralized servers.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NoT Network                                │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Device A   │  │   Device B   │  │   User App   │      │
│  │  (IoT)       │  │  (IoT)       │  │  (Client)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┼──────────────────┘               │
│                           │ Direct WebSocket                  │
│                    ┌──────▼──────┐                           │
│                    │ Nostr Relay │                           │
│                    │  Network    │                           │
│                    └─────────────┘                           │
│                                                               │
│         No gateway required — devices connect directly        │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/not-project.git
cd not-project

# Install dependencies
npm install

# Start development server
npm run dev
```

## Features

- ✅ Decentralized device-to-device communication
- ✅ Event-based messaging using Nostr protocol
- ✅ End-to-end encryption for device data
- ✅ Relay-agnostic design (work with any Nostr relay)
- ✅ Support for sensor data, control commands, and telemetry
- ✅ Lightweight client libraries for embedded devices

## Technology Stack

| Component | Technology |
|-----------|------------|
| Protocol | Nostr (NIPs) |
| Transport | WebSocket / UDP |
| Encryption | Curve25519 + AES-256-GCM |
| Data Format | JSON / CBOR |
| Message Queue | Event-based (NEvent) |

## Project Structure

```
not-project/
├── README.md
├── ARCHITECTURE.md
├── SECURITY.md
├── CONTRIBUTING.md
├── package.json
├── src/
│   ├── core/
│   │   ├── relay/          # Relay implementation
│   │   ├── event/          # Event handling
│   │   └── encryption/     # Encryption utilities
│   ├── clients/
│   │   ├── client.ts       # Base client
│   │   └── device-client/  # IoT device clients
│   ├── protocols/
│   │   ├── sensor/         # Sensor data protocols
│   │   ├── control/        # Control command protocols
│   │   └── telemetry/      # Telemetry protocols
│   └── utils/
│       ├── nsec.ts        # NSEC (Nostr Event Signer)
│       └── helpers.ts
├── tests/
│   ├── unit/
│   └── integration/
└── docs/
    ├── api/
    └── protocols/
```

## Getting Help

- [Documentation](https://docs.not-protocol.io)
- [Discord](https://discord.gg/not-protocol)
- [GitHub Issues](https://github.com/your-username/not-project/issues)

## License

MIT License
