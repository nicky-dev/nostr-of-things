/**
 * NSEC (Nostr Event Signer)
 * Utilities for event signing and keypair generation
 */

import nacl from 'tweetnacl';
import { UnsignedEvent, NotEvent, computeEventId } from '../core/event';

export interface Keypair {
  /** Ed25519 secret key — 64 bytes as lowercase hex */
  privateKey: string;
  /** Ed25519 public key — 32 bytes as lowercase hex */
  publicKey: string;
  /** X25519 (box) public key — 32 bytes as lowercase hex, derived from the same seed */
  boxPublicKey: string;
}

/**
 * Generate a new Ed25519 keypair for Nostr identity.
 * Also derives the corresponding X25519 public key for encrypted messages.
 */
export function generateKeypair(): Keypair {
  const signKeypair = nacl.sign.keyPair();
  const seed = signKeypair.secretKey.slice(0, 32);
  const boxKeypair = nacl.box.keyPair.fromSecretKey(seed);

  return {
    privateKey: Buffer.from(signKeypair.secretKey).toString('hex'),
    publicKey: Buffer.from(signKeypair.publicKey).toString('hex').toLowerCase(),
    boxPublicKey: Buffer.from(boxKeypair.publicKey).toString('hex').toLowerCase(),
  };
}

/**
 * Sign an unsigned event and return the complete signed NotEvent.
 *
 * @param event - Unsigned event (without id or sig)
 * @param privateKey - Ed25519 secret key as hex string (128 chars / 64 bytes)
 * @returns Fully signed NotEvent
 */
export function signEvent(event: UnsignedEvent, privateKey: string): NotEvent {
  const id = computeEventId(event);
  const secretKey = Buffer.from(privateKey, 'hex');
  const signature = nacl.sign.detached(Buffer.from(id, 'hex'), secretKey);

  return {
    ...event,
    id,
    sig: Buffer.from(signature).toString('hex'),
  };
}

/**
 * Verify the signature of a signed NotEvent.
 *
 * @param event - The signed event to verify
 * @param publicKey - Ed25519 public key as hex string (64 chars / 32 bytes)
 * @returns true if the signature is valid
 */
export function verifySignature(event: NotEvent, publicKey: string): boolean {
  const pubkeyBytes = Buffer.from(publicKey, 'hex');
  const idBytes = Buffer.from(event.id, 'hex');
  const sigBytes = Buffer.from(event.sig, 'hex');
  return nacl.sign.detached.verify(idBytes, sigBytes, pubkeyBytes);
}
