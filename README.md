# Obsidian Local REST API MCP Server

An MCP (Model Context Protocol) server that provides LLM tool calls to interact with an Obsidian vault through a local REST API. This server acts as a bridge between MCP clients (like Claude Desktop, VS Code, etc.) and the Obsidian Local REST API.

## Prerequisites

- Node.js 18+ or Bun runtime
- [Obsidian Local REST API](https://github.com/j-shelfwood/obsidian-local-rest-api) running locally (default: http://obsidian-local-rest-api.test)

## Installation

### Using npx (Recommended)

```bash
npx obsidian-local-rest-api-mcp
```

### From Source

```bash
# Clone the repository
git clone https://github.com/j-shelfwood/obsidian-local-rest-api-mcp.git
cd obsidian-local-rest-api-mcp

# Install dependencies with bun
bun install

# Build the project
bun run build
```

## Configuration

Set environment variables for API connection:

```bash
export OBSIDIAN_API_URL="http://obsidian-local-rest-api.test"  # Default URL (or http://localhost:8000 for non-Valet setups)
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
      "command": "npx",
      "args": ["obsidian-local-rest-api-mcp"],
      "env": {
        "OBSIDIAN_API_URL": "http://obsidian-local-rest-api.test",
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

## Troubleshooting

### MCP Server Fails to Start

If your MCP client shows "Start Failed" or similar errors:

1. **Test the server directly**:

   ```bash
   npx obsidian-local-rest-api-mcp --version
   ```

   Should output the version number.

2. **Test MCP protocol**:

   ```bash
   # Run our test script
   node -e "
   const { spawn } = require('child_process');
   const child = spawn('npx', ['obsidian-local-rest-api-mcp'], { stdio: ['pipe', 'pipe', 'pipe'] });
   child.stdout.on('data', d => console.log('OUT:', d.toString()));
   child.stderr.on('data', d => console.log('ERR:', d.toString()));
   setTimeout(() => {
     child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'test',version:'1.0.0'}}})+'\n');
     setTimeout(() => child.kill(), 2000);
   }, 500);
   "
   ```

   Should show initialization response.

3. **Check Environment Variables**:

   - Ensure `OBSIDIAN_API_URL` points to a running Obsidian Local REST API
   - Test the API directly: `curl http://obsidian-local-rest-api.test/api/files` (or your configured API URL)

4. **Verify Obsidian Local REST API**:
   - Install and run [Obsidian Local REST API](https://github.com/j-shelfwood/obsidian-local-rest-api)
   - Confirm it's accessible on the configured port
   - Check if authentication is required

### Common Issues

**"Command not found"**: Make sure Node.js/npm is installed and npx is available

**"Connection refused"**: Obsidian Local REST API is not running or wrong URL

**Laravel Valet .test domains**: If using Laravel Valet, ensure your project directory name matches the .test domain (e.g., `obsidian-local-rest-api.test` for a project in `/obsidian-local-rest-api/`)

**"Unauthorized"**: Check if API key is required and properly configured

**"Timeout"**: Increase timeout in client configuration or check network connectivity

### Cherry Studio Configuration

For Cherry Studio, use these exact settings:

- **Name**: `obsidian-vault` (or any name you prefer)
- **Type**: `Standard Input/Output (stdio)`
- **Command**: `npx`
- **Arguments**: `obsidian-local-rest-api-mcp`
- **Environment Variables**:
  - `OBSIDIAN_API_URL`: Your API URL (e.g., `http://obsidian-local-rest-api.test` for Laravel Valet)
  - `OBSIDIAN_API_KEY`: Optional API key if authentication is required
- **Environment Variables**:
  - `OBSIDIAN_API_URL`: `http://obsidian-local-rest-api.test` (or your API URL)
  - `OBSIDIAN_API_KEY`: `your-api-key` (if required)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper TypeScript types
4. Test with your Obsidian vault
5. Submit a pull request

## License

MIT
