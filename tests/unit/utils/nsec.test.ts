import { generateKeypair, signEvent, verifySignature } from '@not/utils/nsec';
import nacl from 'tweetnacl';
import { createEventTemplate } from '@not/core/event';

const mockNacl = nacl as jest.Mocked<typeof nacl>;

describe('generateKeypair', () => {
  it('should call nacl.sign.keyPair()', () => {
    generateKeypair();
    expect(mockNacl.sign.keyPair).toHaveBeenCalled();
  });

  it('should call nacl.box.keyPair.fromSecretKey with the first 32 bytes of the sign secret key', () => {
    generateKeypair();
    expect(mockNacl.box.keyPair.fromSecretKey).toHaveBeenCalledWith(
      new Uint8Array(64).fill(2).slice(0, 32)
    );
  });

  it('should return a privateKey as a 128-char hex string', () => {
    const kp = generateKeypair();
    expect(kp.privateKey).toHaveLength(128);
    expect(kp.privateKey).toMatch(/^[0-9a-f]+$/);
  });

  it('should return a publicKey as a 64-char lowercase hex string', () => {
    const kp = generateKeypair();
    expect(kp.publicKey).toHaveLength(64);
    expect(kp.publicKey).toBe(kp.publicKey.toLowerCase());
  });

  it('should return a boxPublicKey as a 64-char lowercase hex string', () => {
    const kp = generateKeypair();
    expect(kp.boxPublicKey).toHaveLength(64);
  });
});

describe('signEvent', () => {
  const pubkey = 'a'.repeat(64);
  const privateKey = 'b'.repeat(128);

  it('should call nacl.sign.detached', () => {
    const unsigned = createEventTemplate(30078, pubkey, '{}', []);
    signEvent(unsigned, privateKey);
    expect(mockNacl.sign.detached).toHaveBeenCalled();
  });

  it('should return a NotEvent with id, sig, and all original fields', () => {
    const unsigned = createEventTemplate(30078, pubkey, '{"hello":"world"}', []);
    const signed = signEvent(unsigned, privateKey);

    expect(typeof signed.id).toBe('string');
    expect(signed.id).toHaveLength(64);
    expect(typeof signed.sig).toBe('string');
    expect(signed.sig).toHaveLength(128);
    expect(signed.pubkey).toBe(unsigned.pubkey);
    expect(signed.content).toBe(unsigned.content);
    expect(signed.kind).toBe(unsigned.kind);
  });
});

describe('verifySignature', () => {
  it('should call nacl.sign.detached.verify', () => {
    const unsigned = createEventTemplate(30078, 'a'.repeat(64), '{}', []);
    const signed = signEvent(unsigned, 'b'.repeat(128));
    verifySignature(signed, 'a'.repeat(64));
    expect(mockNacl.sign.detached.verify).toHaveBeenCalled();
  });

  it('should return a boolean', () => {
    const unsigned = createEventTemplate(30078, 'a'.repeat(64), '{}', []);
    const signed = signEvent(unsigned, 'b'.repeat(128));
    const result = verifySignature(signed, 'a'.repeat(64));
    expect(typeof result).toBe('boolean');
  });
});
