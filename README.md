# Obsidian Local REST API MCP Server

An AI-Native MCP (Model Context Protocol) server that provides intelligent, task-oriented tools for interacting with Obsidian vaults through a local REST API.

## 🧠 AI-Native Design Philosophy

This MCP server has been redesigned following AI-Native principles rather than simple API-to-tool mapping. Instead of exposing low-level CRUD operations, it provides high-level, task-oriented tools that LLMs can reason about more effectively.

### Before vs After: The Transformation

| **Old Approach (CRUD-Based)** | **New Approach (AI-Native)** | **Why Better** |
|--------------------------------|-------------------------------|----------------|
| `list_files` (returns everything) | `list_directory(path, limit, offset)` | Prevents context overflow with pagination |
| `create_file` + `update_file` | `write_file(path, content, mode)` | Single tool handles create/update/append |
| `create_note` + `update_note` | `create_or_update_note(path, content, frontmatter)` | Intelligent upsert removes decision complexity |
| `search_notes(query)` | `search_vault(query, scope, path_filter)` | Precise, scopeable search with advanced filtering |
| *(no equivalent)* | `get_daily_note(date)` | High-level abstraction for common workflow |
| *(no equivalent)* | `get_recent_notes(limit)` | Task-oriented recent file access |
| *(no equivalent)* | `find_related_notes(path, on)` | Conceptual relationship discovery |

## 🛠 Available Tools

### Directory & File Operations

#### `list_directory`
**Purpose**: List directory contents with pagination to prevent context overflow
```json
{
  "path": "Projects/",
  "recursive": false,
  "limit": 20,
  "offset": 0
}
```
**AI Benefit**: LLM can explore vault structure incrementally without overwhelming context

#### `read_file`
**Purpose**: Read content of any file in the vault
```json
{"path": "notes/meeting-notes.md"}
```

#### `write_file`
**Purpose**: Write file with multiple modes - replaces separate create/update operations
```json
{
  "path": "notes/summary.md",
  "content": "# Meeting Summary\n...",
  "mode": "append"  // "overwrite", "append", "prepend"
}
```
**AI Benefit**: Single tool handles all write scenarios, removes ambiguity

#### `delete_item`
**Purpose**: Delete any file or directory
```json
{"path": "old-notes/"}
```

### AI-Native Note Operations

#### `create_or_update_note`
**Purpose**: Intelligent upsert - creates if missing, updates if exists
```json
{
  "path": "daily/2024-12-26",
  "content": "## Tasks\n- Review AI-native MCP design",
  "frontmatter": {"tags": ["daily", "tasks"]}
}
```
**AI Benefit**: Eliminates "does this note exist?" decision tree

#### `get_daily_note`
**Purpose**: Smart daily note retrieval with common naming patterns
```json
{"date": "today"}  // or "yesterday", "2024-12-26"
```
**AI Benefit**: Abstracts file system details and naming conventions

#### `get_recent_notes`
**Purpose**: Get recently modified notes
```json
{"limit": 5}
```
**AI Benefit**: Matches natural "what did I work on recently?" queries

### Advanced Search & Discovery

#### `search_vault`
**Purpose**: Multi-scope search with advanced filtering
```json
{
  "query": "machine learning",
  "scope": ["content", "filename", "tags"],
  "path_filter": "research/"
}
```
**AI Benefit**: Precise, targeted search reduces noise

#### `find_related_notes`
**Purpose**: Discover conceptual relationships between notes
```json
{
  "path": "ai-research.md",
  "on": ["tags", "links"]
}
```
**AI Benefit**: Enables relationship-based workflows and serendipitous discovery

### Legacy Tools (Backward Compatibility)

The server maintains backward compatibility with existing tools like `get_note`, `list_notes`, `get_metadata_keys`, etc.

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
