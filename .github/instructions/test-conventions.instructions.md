---
description: "Use when writing, editing, or reviewing test files. Enforces NoT test conventions: tweetnacl mocking, 10s timeout, unit vs integration split, and path aliases."
applyTo: "tests/**"
---

# Test Conventions

## Setup

All tests inherit from [tests/setup.ts](../../tests/setup.ts) via `setupFilesAfterEnv`. Do NOT duplicate this configuration:
- `jest.setTimeout(10000)` — 10-second timeout is preset
- `console.log` / `console.error` are mocked
- `tweetnacl` is mocked globally (see Crypto Mocking below)

## Unit vs Integration Split

| Directory | Purpose | Crypto | What to test |
|-----------|---------|--------|--------------|
| `tests/unit/` | Pure logic, serializers, validators | Mocked tweetnacl (from setup.ts) | Functions in isolation, edge cases, invalid input |
| `tests/integration/` | End-to-end event flow, relay communication | Real tweetnacl (unmock if needed) | Full event lifecycle, signature round-trips |

Place new tests in the correct directory based on this split.

## Crypto Mocking

`tweetnacl` is globally mocked in setup.ts. For unit tests, **use the mock** — do not import real tweetnacl.

For integration tests that need real crypto behavior:

```typescript
// At the top of the integration test file
jest.unmock('tweetnacl');
import nacl from 'tweetnacl';
```

Never verify real cryptographic correctness in unit tests — that belongs in integration tests.

## Conventions

- Use `describe` blocks grouped by function/method name
- Use descriptive `it` names: `'should reject tampered event'` not `'test 3'`
- Import from path aliases: `@not/core`, `@not/clients`, `@not/protocols`
- Test timestamps must be Unix **seconds** (e.g., `1647884523`), not milliseconds
- Public keys in test fixtures must be **lowercase hex**, 64 characters
- Event content must be `JSON.stringify()`'d, not raw objects

## Test Structure Pattern

```typescript
import { myFunction } from '@not/protocols';

describe('myFunction', () => {
  it('should handle valid input', () => { /* ... */ });
  it('should reject missing required fields', () => { /* ... */ });
  it('should handle edge case values', () => { /* ... */ });
});
```
