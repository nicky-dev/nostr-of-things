import { encryptContent, decryptContent, deriveBoxPublicKey } from '@not/core/encryption';
import nacl from 'tweetnacl';

const mockNacl = nacl as jest.Mocked<typeof nacl>;

describe('deriveBoxPublicKey', () => {
  it('should call nacl.box.keyPair.fromSecretKey with the first 32 bytes', () => {
    const secretKey = new Uint8Array(64).fill(2);
    deriveBoxPublicKey(secretKey);
    expect(mockNacl.box.keyPair.fromSecretKey).toHaveBeenCalledWith(secretKey.slice(0, 32));
  });

  it('should return the box public key', () => {
    const secretKey = new Uint8Array(64).fill(2);
    const result = deriveBoxPublicKey(secretKey);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(32);
  });
});

describe('encryptContent', () => {
  const senderSecretKey = new Uint8Array(64).fill(2);
  const recipientBoxPublicKey = new Uint8Array(32).fill(6);

  it('should call nacl.randomBytes for nonce generation', () => {
    encryptContent('hello', senderSecretKey, recipientBoxPublicKey);
    expect(mockNacl.randomBytes).toHaveBeenCalledWith(nacl.box.nonceLength);
  });

  it('should call nacl.box with correct parameters', () => {
    encryptContent('test message', senderSecretKey, recipientBoxPublicKey);
    expect(mockNacl.box).toHaveBeenCalled();
  });

  it('should return a JSON string with ciphertext and nonce fields', () => {
    const result = encryptContent('hello', senderSecretKey, recipientBoxPublicKey);
    const parsed = JSON.parse(result) as { ciphertext: string; nonce: string };
    expect(typeof parsed.ciphertext).toBe('string');
    expect(typeof parsed.nonce).toBe('string');
  });

  it('should base64-encode the ciphertext and nonce', () => {
    const result = encryptContent('hello', senderSecretKey, recipientBoxPublicKey);
    const { ciphertext, nonce } = JSON.parse(result) as { ciphertext: string; nonce: string };
    expect(() => Buffer.from(ciphertext, 'base64')).not.toThrow();
    expect(() => Buffer.from(nonce, 'base64')).not.toThrow();
  });
});

describe('decryptContent', () => {
  const recipientSecretKey = new Uint8Array(64).fill(2);
  const senderBoxPublicKey = new Uint8Array(32).fill(6);

  const makePayload = () =>
    JSON.stringify({
      ciphertext: Buffer.from(new Uint8Array(48).fill(5)).toString('base64'),
      nonce: Buffer.from(new Uint8Array(24).fill(4)).toString('base64'),
    });

  it('should call nacl.box.open with correct parameters', () => {
    decryptContent(makePayload(), recipientSecretKey, senderBoxPublicKey);
    expect(mockNacl.box.open).toHaveBeenCalled();
  });

  it('should return a string', () => {
    const result = decryptContent(makePayload(), recipientSecretKey, senderBoxPublicKey);
    expect(typeof result).toBe('string');
  });

  it('should throw when nacl.box.open returns null', () => {
    (mockNacl.box.open as unknown as jest.Mock).mockReturnValueOnce(null);
    expect(() =>
      decryptContent(makePayload(), recipientSecretKey, senderBoxPublicKey)
    ).toThrow('Decryption failed');
  });

  it('should throw on invalid JSON payload', () => {
    expect(() =>
      decryptContent('not-json', recipientSecretKey, senderBoxPublicKey)
    ).toThrow();
  });
});
