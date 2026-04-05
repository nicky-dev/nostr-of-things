# Contributing to NoT

## How to Contribute

We welcome contributions! Here's how you can help:

### 1. Reporting Bugs

- Use the [Issue Tracker](issues)
- Provide:
  - Environment details
  - Steps to reproduce
  - Expected vs actual behavior
  - Logs/diagnostics

### 2. Feature Requests

- Submit via [Feature Request](issues)
- Include:
  - Use case
  - Design proposal
  - Compatibility considerations

### 3. Code Contributions

#### Setting Up

```bash
git clone https://github.com/your-username/not-project.git
cd not-project
npm install
npm run dev
```

#### Code Style

- Indentation: 2 spaces
- Line width: 100 characters
- Type safety: Required
- Test coverage: >80% target

#### Commit Messages

```
type(scope): description

Details about the change.

Co-Authored-By: Your Name <your@email.com>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Refactoring
- `test`: Tests
- `chore`: Build/dependencies

### 4. Pull Requests

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### 5. Code Review

- PR must pass all tests
- Code must be lint-free
- Add documentation for new features
- Include test coverage for changes

## Architecture Guidelines

### New Protocol

```typescript
// 1. Define event type
export interface MyEvent {
  // event structure
}

// 2. Create serializer
export function serializeMyEvent(event: MyEvent): string {
  // serialize
}

// 3. Create validator
export function validateMyEvent(event: string): boolean {
  // validate
}
```

### New Client

```typescript
class MyClient extends NotClient {
  async connect(): Promise<void> {
    // implementation
  }

  async send(event: NotEvent): Promise<string> {
    // implementation
  }
}
```

## Testing

```bash
npm test          # Run all tests
npm run test:coverage  # Generate coverage report
```

### Test Requirements

- Unit tests for all functions
- Integration tests for event flow
- Security tests for encryption
- Performance tests for throughput

## Documentation

- Update README for user-facing changes
- Add JSDoc comments for APIs
- Document new protocols in `docs/protocols/`

## Code of Conduct

- Be respectful
- Focus on technical merit
- Accept constructive criticism
- Be inclusive

## Questions?

- Join [Discord](https://discord.gg/not-protocol)
- Check [FAQ](docs/faq.md)
- Ask in [GitHub Discussions](https://github.com/your-username/not-project/discussions)
