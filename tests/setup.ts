/**
 * Jest test setup
 */

// Set test timeout
jest.setTimeout(10000);

// Suppress console output in tests
console.error = jest.fn();
console.log = jest.fn();

// Mock tweetnacl globally for unit tests
// Integration tests should use jest.unmock('tweetnacl') at the top of the file
const mockPublicKey = new Uint8Array(32).fill(1);
const mockSecretKey = new Uint8Array(64).fill(2);
const mockBoxPublicKey = new Uint8Array(32).fill(6);
const mockBoxSecretKey = new Uint8Array(32).fill(7);
const mockSignature = new Uint8Array(64).fill(3);
const mockEncrypted = new Uint8Array(48).fill(5);

const mockDetached = jest.fn(() => mockSignature) as jest.Mock & { verify: jest.Mock };
mockDetached.verify = jest.fn(() => true);

const mockSecretboxFn = jest.fn(() => mockEncrypted) as jest.Mock & { open: jest.Mock; nonceLength: number };
mockSecretboxFn.open = jest.fn(() => new Uint8Array(16).fill(9));
mockSecretboxFn.nonceLength = 24;

const mockBoxFn = jest.fn(() => mockEncrypted) as jest.Mock & {
  open: jest.Mock;
  keyPair: jest.Mock & { fromSecretKey: jest.Mock };
  before: jest.Mock;
  nonceLength: number;
  overheadLength: number;
};
mockBoxFn.open = jest.fn(() => new Uint8Array(16).fill(9));
mockBoxFn.keyPair = Object.assign(
  jest.fn(() => ({ publicKey: mockBoxPublicKey, secretKey: mockBoxSecretKey })),
  { fromSecretKey: jest.fn(() => ({ publicKey: mockBoxPublicKey, secretKey: mockBoxSecretKey })) }
);
mockBoxFn.before = jest.fn(() => new Uint8Array(32).fill(8));
mockBoxFn.nonceLength = 24;
mockBoxFn.overheadLength = 16;

jest.mock('tweetnacl', () => ({
  __esModule: true,
  default: {
    sign: {
      keyPair: jest.fn(() => ({ publicKey: mockPublicKey, secretKey: mockSecretKey })),
      detached: mockDetached,
    },
    box: mockBoxFn,
    secretbox: mockSecretboxFn,
    randomBytes: jest.fn((n: number) => new Uint8Array(n).fill(4)),
  },
}));
