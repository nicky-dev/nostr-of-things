/**
 * Jest test setup
 */

// Set test timeout
jest.setTimeout(10000);

// Suppress console output in tests
console.error = jest.fn();
console.log = jest.fn();

// Mock external dependencies
jest.mock('tweetnacl', () => ({
  sign: {
    keyPair: jest.fn(() => ({
      publicKey: new Uint8Array(32),
      secretKey: new Uint8Array(32),
      sign: jest.fn(),
    })),
  },
}));
