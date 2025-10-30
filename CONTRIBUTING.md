# Contributing to Supabase MCP Server

First off, thank you for considering contributing to Supabase MCP Server! It's people like you that make this project such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [INSERT CONTACT EMAIL].

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples** (code snippets, screenshots, etc.)
* **Describe the behavior you observed** and what you expected
* **Include environment details** (OS, Node.js version, Docker version, etc.)

**Bug Report Template:**

```markdown
## Bug Description
A clear description of the bug.

## Steps to Reproduce
1. Step one
2. Step two
3. ...

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens.

## Environment
- OS: [e.g., Ubuntu 22.04]
- Node.js: [e.g., 20.10.0]
- Docker: [e.g., 24.0.7]
- Deployment: [Docker/PM2/systemd]

## Additional Context
Any other relevant information.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

* **Use a clear and descriptive title**
* **Provide a detailed description** of the suggested enhancement
* **Explain why this enhancement would be useful**
* **List potential alternatives** you've considered

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Add tests** if applicable
4. **Ensure all tests pass**: `npm test`
5. **Run type checking**: `npm run typecheck`
6. **Run linting**: `npm run lint`
7. **Update documentation** if needed
8. **Write a clear commit message** following our conventions

**Pull Request Process:**

1. Update the README.md with details of changes if applicable
2. Update the CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/) format
3. Ensure your PR passes all CI checks
4. Request review from maintainers
5. Address review feedback promptly

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/supabase-mcp-server.git
cd supabase-mcp-server

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Run in development mode
npm run dev:http

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## Coding Standards

### TypeScript

* **Use strict TypeScript** - no `any` types
* **Proper type annotations** for all functions
* **Use type guards** for unknown types
* **Follow existing code style**

### Code Style

* **Use Biome.js** for formatting and linting
* **Run `npm run format`** before committing
* **2 spaces** for indentation
* **Single quotes** for strings
* **Semicolons** required
* **Trailing commas** in multiline structures

### Naming Conventions

* **camelCase** for variables and functions
* **PascalCase** for classes and types
* **UPPER_SNAKE_CASE** for constants
* **Descriptive names** - avoid abbreviations

### Documentation

* **JSDoc comments** for public APIs
* **Inline comments** for complex logic
* **Update README.md** for new features
* **Add examples** for new tools

### Testing

* **Write tests** for new features
* **Maintain coverage** above 80%
* **Test edge cases** and error conditions
* **Use descriptive test names**

```typescript
describe('DokploySetupWizard', () => {
  it('should create project when none exists', async () => {
    // Test implementation
  });

  it('should throw error when API key is invalid', async () => {
    // Test implementation
  });
});
```

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
* `feat`: New feature
* `fix`: Bug fix
* `docs`: Documentation changes
* `style`: Code style changes (formatting, etc.)
* `refactor`: Code refactoring
* `test`: Adding or updating tests
* `chore`: Maintenance tasks
* `perf`: Performance improvements

**Examples:**

```bash
feat(dokploy): add automatic project selection

Implements intelligent project selection that prompts the user when multiple
projects exist instead of automatically choosing the first one.

Closes #42
```

```bash
fix(health-check): correct status code handling

Health check was returning 200 even when Dokploy connection failed.
Now properly returns error status.
```

## Project Structure

```
src/
├── lib/              # Shared libraries
│   ├── dokploy/     # Dokploy API client
│   ├── postgres/    # PostgreSQL utilities
│   ├── supabase/    # Supabase client wrapper
│   ├── errors/      # Error classes
│   ├── memory/      # Memory management
│   ├── utils/       # Utility functions
│   └── validation/  # Validators
├── tools/           # MCP tool implementations
│   ├── dokploy/    # Dokploy tools
│   ├── backups/    # Backup tools
│   ├── migrations/ # Migration tools
│   └── storage/    # Storage tools
├── types/          # TypeScript type definitions
├── index.ts        # stdio MCP server
└── server-http.ts  # HTTP/SSE MCP server
```

## Testing Strategy

### Unit Tests

Test individual functions and classes in isolation:

```typescript
import { JWTGenerator } from './jwt-generator';

describe('JWTGenerator', () => {
  it('generates valid JWT keys', () => {
    const keys = JWTGenerator.generateKeySet();
    expect(keys.anonKey).toBeDefined();
    expect(keys.serviceRoleKey).not.toBe(keys.anonKey);
  });
});
```

### Integration Tests

Test component interactions:

```typescript
describe('Dokploy Setup Wizard', () => {
  it('deploys complete Supabase instance', async () => {
    // Integration test with real Dokploy instance
  });
});
```

### End-to-End Tests

Test complete workflows using Docker Compose test environment.

## Documentation

### Code Documentation

Use JSDoc for all public APIs:

```typescript
/**
 * Generates a set of JWT keys for Supabase authentication
 *
 * @param secret - The JWT secret (32+ characters)
 * @param options - Optional configuration
 * @returns Generated JWT key set with anon and service role keys
 * @throws {Error} If secret is too short
 *
 * @example
 * ```typescript
 * const keys = JWTGenerator.generateKeySet('my-secret-key');
 * console.log(keys.anonKey);
 * ```
 */
export function generateKeySet(
  secret: string,
  options?: GeneratorOptions
): JWTKeySet {
  // Implementation
}
```

### README Updates

When adding features, update:
1. Feature list in README.md
2. Usage examples
3. Configuration options
4. API documentation

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.2.3`
4. Push: `git push origin v1.2.3`
5. GitHub Actions will create release

## Getting Help

* **Questions**: Open a [Discussion](https://github.com/q23/supabase-mcp-server/discussions)
* **Bugs**: Open an [Issue](https://github.com/q23/supabase-mcp-server/issues)
* **Security**: Email security@[domain].com

## Recognition

Contributors will be recognized in:
* README.md Contributors section
* Release notes
* CHANGELOG.md

Thank you for contributing! 🎉
