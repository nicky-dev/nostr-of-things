/**
 * Core Encryption Module — NIP-04-like encryption using tweetnacl (X25519 + XSalsa20-Poly1305)
 *
 * Encrypted content is stored as a JSON string: { ciphertext: "<base64>", nonce: "<base64>" }
 * The sender's first 32 bytes of Ed25519 secretKey is used as the X25519 scalar for ECDH.
 */

import nacl from 'tweetnacl';

export interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
}

/**
 * Derive the X25519 (box) public key from an Ed25519 signing secret key.
 * Uses the first 32 bytes (seed scalar) as the Curve25519 private key.
 */
export function deriveBoxPublicKey(signSecretKey: Uint8Array): Uint8Array {
  const seed = signSecretKey.slice(0, 32);
  return nacl.box.keyPair.fromSecretKey(seed).publicKey;
}

/**
 * Encrypt a plaintext message for a recipient.
 *
 * @param message - UTF-8 plaintext
 * @param senderSecretKey - sender's Ed25519 secretKey (64 bytes)
 * @param recipientBoxPublicKey - recipient's X25519 public key (32 bytes)
 * @returns JSON string with base64-encoded ciphertext and nonce
 */
export function encryptContent(
  message: string,
  senderSecretKey: Uint8Array,
  recipientBoxPublicKey: Uint8Array
): string {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const senderBoxKey = senderSecretKey.slice(0, 32);
  const messageBytes = new TextEncoder().encode(message);
  const encrypted = nacl.box(messageBytes, nonce, recipientBoxPublicKey, senderBoxKey);

  const payload: EncryptedPayload = {
    ciphertext: Buffer.from(encrypted).toString('base64'),
    nonce: Buffer.from(nonce).toString('base64'),
  };
  return JSON.stringify(payload);
}

/**
 * Decrypt an encrypted message payload.
 *
 * @param encryptedJson - JSON string produced by encryptContent
 * @param recipientSecretKey - recipient's Ed25519 secretKey (64 bytes)
 * @param senderBoxPublicKey - sender's X25519 public key (32 bytes)
 * @returns Decrypted UTF-8 plaintext
 * @throws Error if decryption fails
 */
export function decryptContent(
  encryptedJson: string,
  recipientSecretKey: Uint8Array,
  senderBoxPublicKey: Uint8Array
): string {
  const { ciphertext, nonce } = JSON.parse(encryptedJson) as EncryptedPayload;
  const recipientBoxKey = recipientSecretKey.slice(0, 32);
  const decrypted = nacl.box.open(
    Buffer.from(ciphertext, 'base64'),
    Buffer.from(nonce, 'base64'),
    senderBoxPublicKey,
    recipientBoxKey
  );

  if (!decrypted) {
    throw new Error('Decryption failed: invalid ciphertext or key mismatch');
  }

  return new TextDecoder().decode(decrypted);
}
