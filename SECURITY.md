# Security

## Cryptographic Standards

### Key Management

- **Key Pair**: Ed25519 for signing (NIP-02 compliant)
- **Encryption**: AES-256-GCM for sensitive payloads
- **Curve**: Curve25519 for key exchange

### Event Signing

All events must be signed according to NIP-01:

1. Construct event object
2. Serialize to JSON
3. Compute SHA256 of JSON
4. Sign SHA256 with private key
5. Set `sig` field with signature

## Threat Model

### Attacker Capabilities

- Network monitoring (MITM)
- Relay compromise
- Timing attacks
- DDoS attacks

### Mitigations

| Threat | Mitigation |
|--------|------------|
| MITM | End-to-end encryption |
| Relay Compromise | NIP-01 signatures validate |
| Timing | Constant-time operations |
| DDoS | Rate limiting + NIP-05 verification |

## Best Practices

1. **Never share private keys**
2. **Use hardware security modules** (HSM) for key storage
3. **Rotate keys periodically**
4. **Verify event signatures** before processing
5. **Validate sensor data** ranges and units
6. **Implement rate limiting** on endpoints

## Incident Response

### Data Breach

1. Revoke affected device credentials
2. Rotate all private keys
3. Audit relay logs
4. Notify affected parties

### Relay Compromise

1. Disable compromised relay
2. Audit all recent events
3. Alert network participants
4. Consider temporary network isolation

## Compliance

- **GDPR**: Data minimization + right to erasure
- **HIPAA**: If handling health device data
- **CCPA**: Consumer data protection
