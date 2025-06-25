# Contributing

## Development Setup

1. Clone the repository
2. Install dependencies: `bun install`
3. Build the project: `bun run build`
4. Run tests: `bun test`

## Testing

The project uses Bun's built-in test runner. Tests are located in `test/integration.test.ts` and cover:

- Binary compilation and execution
- TypeScript type checking
- Environment configuration
- Server startup behavior
- Package configuration validation

Run tests with: `bun test`

## Publishing

The project is automatically published to npm when a GitHub release is created. To publish manually:

1. Ensure all tests pass: `bun test`
2. Build the project: `bun run build`
3. Publish: `npm publish --access public`

## CI/CD

GitHub Actions workflow runs on:

- Push to main/master branches
- Pull requests
- GitHub releases

The workflow:

- Tests on multiple Bun versions
- Runs linting and tests
- Builds the project
- Publishes to npm on releases (requires NPM_TOKEN secret)

## Architecture

The MCP server implements the Model Context Protocol specification and provides tools for:

- File operations (list, get, create, update, delete)
- Note operations with frontmatter support
- Metadata extraction and search
- Content search across vault

All API calls are made to the Obsidian Local REST API with configurable base URL and authentication.
