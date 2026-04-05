# Architecture

## Core Components

### 1. Relay Layer

The relay layer is the heart of the NoT network, responsible for:

- **Event Routing**: Forwarding events between devices and clients
- **Subscription Management**: Handling NIP-01 subscription requests
- **Filter Processing**: Filtering events based on NIP-01 filters
- **Relay Federation**: Communicating with other Nostr relays

### 2. Client Types

#### Device Client
- Lightweight client for IoT devices
- Minimal resource footprint
- Event-based communication
- Supports offline queuing

#### User Client
- Standard Nostr client (like dcon, Snort, etc.)
- Full feature set
- Interactive UI support

### 3. Event Types

| Type | Description | Payload |
|------|-------------|---------|
| `sensor.data` | Sensor readings | JSON sensor data |
| `sensor.alert` | Sensor alerts | Alert message + severity |
| `device.cmd` | Device commands | Command + parameters |
| `device.status` | Device status | Status codes + diagnostics |
| `device.event` | Device events | Event data |
| `telemetry.metric` | Metrics | Metric name + value |
| `telemetry.error` | Errors | Error + stack trace |

### 4. Security Model

- **Authentication**: Public key cryptography (NIP-02)
- **Encryption**: Per-message encryption for sensitive data
- **Authorization**: Device capability tokens
- **Integrity**: Cryptographic signatures on all events

### 5. Network Topology

```
        ┌─────────────┐                    ┌─────────────┐
        │  Device A    │                    │  User Client│
        │  (embedded)  │                    │  (app/web)  │
        └──────┬───────┘                    └──────┬──────┘
               │ WebSocket                         │ WebSocket
               │                                   │
        ┌──────▼───────────────────────────────────▼──────┐
        │              Nostr Relay Network                 │
        │         (any NIP-01 compliant relay)             │
        └──────┬───────────────────────────────────┬──────┘
               │ WebSocket                         │ WebSocket
        ┌──────▼───────┐                    ┌──────▼──────┐
        │  Device B    │                    │  Device C   │
        │  (embedded)  │                    │  (embedded) │
        └──────────────┘                    └─────────────┘
```

Devices connect **directly** to Nostr relays — no gateway or bridge required.

## Design Principles

1. **Decentralization**: No central authority
2. **Interoperability**: Standard Nostr protocol compliance
3. **Privacy**: End-to-end encryption
4. **Resilience**: Peer-to-peer fault tolerance
5. **Simplicity**: Minimal protocol overhead

## Data Flow

```
Device ────► Publish Event ────► Nostr Relay ────► User Client
                                      ▲                  │
                                      │                  │
                                      └── Subscribe ◄───┘
```

## Implementation Details

### Event Structure

```typescript
interface NotEvent {
  id: string;              // SHA256 hash
  pubkey: string;          // Hex-encoded public key
  created_at: number;      // Unix timestamp
  tags: string[][];        // Event tags (NIP-01)
  content: string;         // Event payload (JSON)
  sig: string;             // SHA256 signature
}
```

### Sensor Payload

```typescript
interface SensorData {
  sensor_id: string;       // Device sensor identifier
  readings: {
    [key: string]: number, // sensor name -> value
  },
  metadata?: {
    unit: string,          // e.g., 'celsius'
    accuracy: number,      // ±0.1
    sample_rate: number,   // Hz
  },
}
```
