# Obsidian Local REST API MCP Server

An MCP (Model Context Protocol) server that provides LLM tool calls to interact with an Obsidian vault through a local REST API. This server acts as a bridge between MCP clients (like Claude Desktop, VS Code, etc.) and the Obsidian Local REST API.

<a href="https://glama.ai/mcp/servers/@j-shelfwood/obsidian-local-rest-api-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@j-shelfwood/obsidian-local-rest-api-mcp/badge" alt="Obsidian Local REST API Server MCP server" />
</a>

## Prerequisites

- Node.js 18+ or Bun runtime
- [Obsidian Local REST API](https://github.com/j-shelfwood/obsidian-local-rest-api) running locally (default: http://localhost:8000)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd obsidian-local-rest-api-mcp

# Install dependencies with bun
bun install

# Build the project
bun run build
```

## Configuration

Set environment variables for API connection:

```bash
export OBSIDIAN_API_URL="http://localhost:8000"  # Default URL
export OBSIDIAN_API_KEY="your-api-key"          # Optional bearer token
```

## Usage

### Running the Server

```bash
# Development mode with auto-reload
bun run dev

# Production mode
bun run start

# Or run directly
node build/index.js
```

### MCP Client Configuration

#### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "obsidian-vault": {
      "command": "node",
      "args": ["/absolute/path/to/obsidian-local-rest-api-mcp/build/index.js"],
      "env": {
        "OBSIDIAN_API_URL": "http://localhost:8000",
        "OBSIDIAN_API_KEY": "your-api-key-if-needed"
      }
    }
  }
}
```

#### VS Code with MCP Extension

Use the included `.vscode/mcp.json` configuration file.

## Available Tools

### File Operations
- **list_files** - List all files in the vault
- **get_file** - Get content of a specific file
- **create_file** - Create a new file or directory
- **update_file** - Update file content
- **delete_file** - Delete a file

### Note Operations
- **list_notes** - List notes with metadata
- **get_note** - Get note with frontmatter
- **create_note** - Create note with optional frontmatter
- **update_note** - Update note content/frontmatter
- **delete_note** - Delete a note
- **search_notes** - Search notes by content

### Metadata Operations
- **get_metadata_keys** - List all frontmatter keys
- **get_metadata_values** - Get unique values for a key

## Development

```bash
# Watch mode for development
bun run dev

# Build TypeScript
bun run build

# Type checking
bun run tsc --noEmit
```

## Architecture

- **ObsidianApiClient** - HTTP client wrapper for REST API endpoints
- **ObsidianMcpServer** - MCP server implementation with tool handlers
- **Configuration** - Environment-based configuration with validation

## Error Handling

The server includes comprehensive error handling:
- API connection failures
- Invalid tool parameters
- Network timeouts
- Authentication errors

Errors are returned as MCP tool call responses with descriptive messages.

## Debugging

Enable debug logging by setting environment variables:

```bash
export DEBUG=1
export NODE_ENV=development
```

Server logs are written to stderr to avoid interfering with MCP protocol communication on stdout.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper TypeScript types
4. Test with your Obsidian vault
5. Submit a pull request

## License

MIT