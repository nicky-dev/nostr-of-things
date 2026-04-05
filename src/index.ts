/**
 * NoT (Nostr of Things) - Main Entry Point
 *
 * This is the entry point for the NoT protocol implementation.
 * Use this to bootstrap the decentralized IoT network.
 */

import { generateKeypair } from './utils/nsec';
import { NotClient, ClientConfig, NotEvent } from './clients/client';

// Generate default keypair for demonstration
const { privateKey, publicKey } = generateKeypair();

console.log(`NoT Network Initialized`);
console.log(`Public Key: ${publicKey}`);
console.log(`Private Key: ${privateKey}`);

// Export main interfaces and classes
export { NotClient, generateKeypair, ClientConfig, NotEvent };
