---
description: "Add a new custom IoT event kind to the NIP-XX-IoT spec: assigns the next available kind number, updates copilot-instructions.md, and scaffolds type/serializer/validator"
agent: "agent"
argument-hint: "category.name — e.g., sensor.humidity, device.config, telemetry.health"
---

Add a new custom IoT event kind: **${{ eventType }}**

## Current Event Kind Ranges

Existing kinds in [.github/copilot-instructions.md](../../.github/copilot-instructions.md):

| Range       | Category   | Encrypted | Next available |
|-------------|------------|-----------|----------------|
| `30078`–`30079` | sensor.*   | No        | `30079` + 1 if sensor type |
| `4078`–`4079`   | device.*   | Yes (NIP-04) | `4079` + 1 if device type |
| `30080`         | device.event | No      | —              |
| `30081`–`30082` | telemetry.* | No      | `30082` + 1 if telemetry type |

## Steps

### 1. Determine the kind number

- Parse the category prefix from `${{ eventType }}` (e.g., `sensor`, `device`, `telemetry`)
- Check the existing table in copilot-instructions.md for the highest kind in that category
- Assign the next sequential number
- If the new kind handles sensitive data (commands, credentials, private status), use the encrypted range (`4xxx`) with NIP-04 encryption
- If it's a public reading/metric, use the parameterized replaceable range (`30xxx`)

### 2. Update copilot-instructions.md

Add a new row to the NIP-XX-IoT table in [.github/copilot-instructions.md](../../.github/copilot-instructions.md):

```
| `{kind}` | `{eventType}` | {description} |
```

Update the encryption/range notes if the new kind changes the boundary.

### 3. Scaffold the implementation

Create or update files in `src/protocols/{category}/`:

**`types.ts`** — add:
```typescript
export const {EVENT_TYPE}_KIND = {kind};

export interface {EventType}Payload {
  // fields appropriate for this event type
}
```

**`serializer.ts`** — add:
```typescript
export function serialize{EventType}(
  devicePubkey: string,
  sensorId: string,
  payload: {EventType}Payload
): { content: string; tags: string[][]; kind: number } {
  return {
    content: JSON.stringify(payload),
    tags: [
      ['d', `${devicePubkey}:${sensorId}`],
      ['t', '{eventType}'],
    ],
    kind: {EVENT_TYPE}_KIND,
  };
}
```

**`validator.ts`** — add:
```typescript
export function validate{EventType}(content: string): boolean {
  // Parse JSON, check required fields and types
}
```

Update `index.ts` to re-export the new kind.

### 4. Add tests

Create or update `tests/unit/{category}-{name}.test.ts`:
- Valid payload serialization
- Valid payload validation
- Missing required fields rejected
- Invalid field types rejected

### 5. Update the nip-reviewer agent

Add the new kind to the event kinds table in [.github/agents/nip-reviewer.agent.md](../../.github/agents/nip-reviewer.agent.md) so the reviewer validates the new kind correctly.

### 6. Verify

Run `pnpm run typecheck` to confirm strict TypeScript compliance.
