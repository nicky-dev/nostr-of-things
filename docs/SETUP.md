# Setup Guide

## Prerequisites

- Node.js 18+
- npm 9+
- TypeScript 5.2+

## Installation

```bash
# Clone repository
git clone https://github.com/your-username/not-project.git
cd not-project

# Install dependencies
npm install

# Run tests
npm test
```

## Development

```bash
# Start TypeScript dev server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Type check
npm run typecheck
```

## Project Structure

```
not-project/
├── src/
│   ├── core/           # Core protocols (relay, event, encryption)
│   ├── clients/        # Client implementations
│   ├── protocols/      # IoT protocols (sensor, control, telemetry)
│   └── utils/          # Utilities
├── tests/              # Test suites
├── docs/               # Documentation
└── package.json        # Dependencies
```

## Next Steps

1. Read `ARCHITECTURE.md` for protocol details
2. Review `SECURITY.md` for security best practices
3. Check `CONTRIBUTING.md` to contribute
4. See `PROMPT.md` for development instructions
