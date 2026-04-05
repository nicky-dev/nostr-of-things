/**
 * NSEC (Nostr Event Signer)
 * Utilities for event signing and pubkey generation
 */

import { nacl } from 'tweetnacl';

/**
 * Generate a new keypair
 * @returns {Object} { privateKey, publicKey }
 */
/**
 * Generate a new keypair
 * @returns {Object} { privateKey, publicKey }
 */
export function generateKeypair(): { privateKey: string; publicKey: string } {
  const keypair = nacl.sign.keyPair();
  const privateKey = Buffer.from(keypair.secretKey).toString('hex');
  const publicKey = Buffer.from(keypair.publicKey).toString('hex');
  return { privateKey, publicKey: publicKey.toLowerCase() };
}

/**
 * Sign an event
 * @param event - The event to sign
 * @param privateKey - Private key hex string
 * @returns {string} Signature
 */
export function signEvent(event: any, privateKey: string): string {
  const secretKey = Buffer.from(privateKey, 'hex');
  const message = JSON.stringify(event);
  const signature = nacl.sign.detached(Buffer.from(message), secretKey);
  return Buffer.from(signature).toString('hex');
}

/**
 * Verify an event signature
 * @param event - The event to verify
 * @param publicKey - Public key hex string
 * @returns {boolean} True if valid
 */
export function verifyEvent(event: any, publicKey: string): boolean {
  const secretKey = Buffer.from(publicKey, 'hex');
  const message = JSON.stringify(event);
  return nacl.sign.detached.verify(
    Buffer.from(message),
    Buffer.from(event.sig, 'hex'),
    secretKey
  );
}
