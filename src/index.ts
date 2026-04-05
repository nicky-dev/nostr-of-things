/**
 * NoT (Nostr of Things) — Public API
 *
 * Decentralized IoT communication protocol built on Nostr.
 * Devices connect directly to Nostr relays — no gateway required.
 */

// Core
export * from './core/event';
export * from './core/encryption';
export * from './core/relay';

// Clients — NotEvent re-exported from core, avoid duplicate
export { NotClient, ClientConfig } from './clients/client';
export * from './clients/device';
export * from './clients/user';

// Protocols
export * from './protocols/sensor';
export * from './protocols/control';
export * from './protocols/telemetry';

// Utils
export * from './utils/nsec';
export * from './utils/helpers';
