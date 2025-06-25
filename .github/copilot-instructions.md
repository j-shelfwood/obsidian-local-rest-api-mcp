<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Obsidian Local REST API MCP Server

You can find more info and examples at https://modelcontextprotocol.io/llms-full.txt

## Project Context

This is an MCP (Model Context Protocol) server that provides LLM tool calls to interact with an Obsidian vault through a local REST API. The server acts as a bridge between MCP clients (like Claude Desktop, VS Code, etc.) and the Obsidian Local REST API.

## Architecture

- **MCP Server**: Implements the Model Context Protocol server specification
- **API Client**: Wraps the Obsidian Local REST API endpoints
- **Tools**: Exposes vault operations as MCP tools for LLM consumption

## Key Files

- `src/index.ts` - Main MCP server implementation
- `package.json` - Project configuration with bun support
- `tsconfig.json` - TypeScript configuration optimized for Node16 modules

## Available Tools

The server exposes these tools to MCP clients:

### File Operations
- `list_files` - List all files in vault
- `get_file` - Get file content
- `create_file` - Create new file/directory
- `update_file` - Update file content
- `delete_file` - Delete file

### Note Operations  
- `list_notes` - List notes with metadata
- `get_note` - Get note with frontmatter
- `create_note` - Create note with optional frontmatter
- `update_note` - Update note content/frontmatter
- `delete_note` - Delete note
- `search_notes` - Search notes by content

### Metadata Operations
- `get_metadata_keys` - List all frontmatter keys
- `get_metadata_values` - Get unique values for a key

## Configuration

Set environment variables:
- `OBSIDIAN_API_URL` - Base URL of the REST API (default: http://localhost:8000)
- `OBSIDIAN_API_KEY` - Optional bearer token for authentication

## Development Guidelines

- Use TypeScript strict mode
- Follow MCP protocol specifications
- Handle errors gracefully with meaningful messages
- Validate inputs using zod schemas
- Use proper async/await patterns
- Log errors to stderr (stdout reserved for MCP protocol)
