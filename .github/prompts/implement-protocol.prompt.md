---
description: "Implement a new NoT protocol module following the Define → Serialize → Validate pattern with NIP-XX-IoT event kinds"
agent: "agent"
---

Implement the **${{ protocolName }}** protocol in `src/protocols/`.

## Context

This project uses custom IoT event kinds (NIP-XX-IoT):

| Kind    | Type               | Description                                  |
|---------|--------------------|----------------------------------------------|
| `30078` | `sensor.data`      | Sensor readings (parameterized replaceable)  |
| `30079` | `sensor.alert`     | Alert message + severity                     |
| `4078`  | `device.cmd`       | Encrypted device command + params            |
| `4079`  | `device.status`    | Encrypted status + diagnostics               |
| `30080` | `device.event`     | General device event data                    |
| `30081` | `telemetry.metric` | Metric name + value                          |
| `30082` | `telemetry.error`  | Error + stack trace                          |

Rules:
- Kinds `4078`-`4079` use NIP-04 encryption
- Kinds `30078`-`30082` are parameterized replaceable events
- Tag `d` = `{device_pubkey}:{sensor_id}` for addressability
- Tag `t` = event type (e.g., `sensor.data`, `device.cmd`)
- All payloads are JSON-stringified in `content`

## Steps

Follow **Define → Serialize → Validate** (see [CONTRIBUTING.md](../../CONTRIBUTING.md)):

### 1. Define — Create TypeScript interfaces

- Define the protocol's payload interface with strict types (no `any`)
- Include all required fields and optional metadata
- Use the correct event kind from the table above
- Reference [NotEvent](../../src/clients/client.ts) for the base event structure

### 2. Serialize — Create serializer function

- `serialize{Name}(payload): string` — JSON-stringify the payload for the `content` field
- Build the proper `tags` array with `d` (addressability) and `t` (event type) tags
- Timestamps must be Unix seconds (not milliseconds)
- Public keys must be lowercase hex

### 3. Validate — Create validator function

- `validate{Name}(content: string): boolean` — parse and validate the JSON content
- Check required fields, types, and value ranges
- Return `boolean` (no exceptions for invalid data)

## Output Files

Create in `src/protocols/{protocolName}/`:
- `types.ts` — interfaces and event kind constants
- `serializer.ts` — serialization functions
- `validator.ts` — validation functions
- `index.ts` — re-exports

Create in `tests/unit/`:
- `{protocolName}.test.ts` — unit tests covering valid data, edge cases, and invalid input

Use path alias `@not/protocols` for imports. Run `pnpm run typecheck` after implementation to verify.
