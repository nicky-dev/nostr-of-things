---
description: "Review project progress: compare what's documented in ARCHITECTURE.md and README.md against actual implementations, flag gaps, and suggest next steps"
agent: "agent"
---

Review the current state of the NoT project and produce a roadmap status report.

## Process

### 1. Gather planned scope

Read these files to understand what **should** exist:
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — components, event types, security model
- [README.md](../../README.md) — project structure, planned directories
- [.github/copilot-instructions.md](../../.github/copilot-instructions.md) — NIP-XX-IoT event kinds, conventions

### 2. Audit actual implementation

Search `src/` and `tests/` to determine what **actually** exists. For each file found, assess:
- Is it a stub/README-only, or does it contain real implementation?
- Does it have corresponding tests?
- Does it follow project conventions (Define → Serialize → Validate for protocols, 4 abstract methods for clients)?

### 3. Produce the status report

#### Component Status Table

| Component | Location | Status | Tests | Notes |
|-----------|----------|--------|-------|-------|
| {name} | {path} | {⬚ Planned / 🔨 Partial / ✅ Done} | {Yes/No} | {blockers or gaps} |

Cover all components:
- Core: encryption, relay, event
- Clients: DeviceClient, UserClient
- Protocols: sensor, control, telemetry
- Each NIP-XX-IoT event kind (30078–30082, 4078–4079)

#### Dependency Order

List components in implementation order based on what depends on what. Flag any component being built without its dependencies.

#### Gaps & Risks

- Missing implementations that block other work
- Documented features with no code path
- Tests that exist but test unimplemented code (will always pass trivially)
- NIP-XX-IoT event kinds defined but not yet used in any protocol

#### Recommended Next Steps

Suggest the top 3 things to implement next, with rationale.
