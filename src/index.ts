#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--version') || args.includes('-v')) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packagePath = join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  console.log(packageJson.version);
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Obsidian Local REST API MCP Server

Usage: obsidian-local-rest-api-mcp [options]

Options:
  -v, --version    Show version number
  -h, --help       Show help

Environment Variables:
  OBSIDIAN_API_URL    Base URL for Obsidian REST API (default: http://obsidian-local-rest-api.test)
  OBSIDIAN_API_KEY    Optional bearer token for authentication

This is an MCP server that communicates via stdio. It should be configured
in your MCP client (like Claude Desktop) rather than run directly.

Example Claude Desktop configuration:
{
  "mcpServers": {
    "obsidian-vault": {
      "command": "npx",
      "args": ["obsidian-local-rest-api-mcp"],
      "env": {
        "OBSIDIAN_API_URL": "http://localhost:8000"
      }
    }
  }
}
`);
  process.exit(0);
}

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Configuration schema
const ConfigSchema = z.object({
  baseUrl: z.string().url().default("http://obsidian-local-rest-api.test"),
  apiKey: z.string().optional(),
});

type Config = z.infer<typeof ConfigSchema>;

// API client for Obsidian REST API
class ObsidianApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: Config) {
    this.baseUrl = `${config.baseUrl}/api`;
    this.headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    if (config.apiKey) {
      this.headers.Authorization = `Bearer ${config.apiKey}`;
    }
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Enhanced API client methods for AI-native operations

  // Directory operations
  async listDirectory(path: string = ".", recursive: boolean = false, limit: number = 50, offset: number = 0) {
    const params = new URLSearchParams({
      path,
      recursive: recursive.toString(),
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return this.request(`/vault/directory?${params}`);
  }

  // File operations
  async readFile(path: string) {
    return this.request(`/files/${encodeURIComponent(path)}`);
  }

  async writeFile(path: string, content: string, mode: string = "overwrite") {
    return this.request("/files/write", {
      method: "POST",
      body: JSON.stringify({ path, content, mode }),
    });
  }

  async deleteItem(path: string) {
    return this.request(`/files/${encodeURIComponent(path)}`, {
      method: "DELETE",
    });
  }

  // AI-native note operations
  async createOrUpdateNote(path: string, content: string, frontmatter: Record<string, any> = {}) {
    return this.request("/notes/upsert", {
      method: "POST",
      body: JSON.stringify({
        path,
        content,
        front_matter: frontmatter
      }),
    });
  }

  async getDailyNote(date: string = "today") {
    const params = new URLSearchParams({ date });
    return this.request(`/vault/notes/daily?${params}`);
  }

  async getRecentNotes(limit: number = 5) {
    const params = new URLSearchParams({ limit: limit.toString() });
    return this.request(`/vault/notes/recent?${params}`);
  }

  // Enhanced search
  async searchVault(query: string, scope: string[] = ["content", "filename", "tags"], pathFilter?: string) {
    const params = new URLSearchParams({
      query,
      scope: scope.join(","),
    });
    if (pathFilter) {
      params.append("path_filter", pathFilter);
    }
    return this.request(`/vault/search?${params}`);
  }

  async findRelatedNotes(path: string, on: string[] = ["tags", "links"]) {
    const params = new URLSearchParams({
      on: on.join(","),
    });
    return this.request(`/vault/notes/related/${encodeURIComponent(path)}?${params}`);
  }

  // Legacy methods for backward compatibility
  async listFiles() {
    return this.request("/files");
  }

  async getFile(path: string) {
    return this.request(`/files/${encodeURIComponent(path)}`);
  }

  async createFile(path: string, content: string, type: "file" | "directory" = "file") {
    return this.request("/files", {
      method: "POST",
      body: JSON.stringify({ path, content, type }),
    });
  }

  async updateFile(path: string, content: string) {
    return this.request(`/files/${encodeURIComponent(path)}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  }

  async deleteFile(path: string) {
    return this.request(`/files/${encodeURIComponent(path)}`, {
      method: "DELETE",
    });
  }

  // Notes endpoints
  async listNotes() {
    return this.request("/notes");
  }

  async getNote(path: string) {
    return this.request(`/notes/${encodeURIComponent(path)}`);
  }

  async createNote(path: string, content: string, frontmatter?: Record<string, any>) {
    const body: any = { path, content };
    if (frontmatter) {
      body.frontmatter = frontmatter;
    }
    return this.request("/notes", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async updateNote(path: string, content?: string, frontmatter?: Record<string, any>) {
    const body: any = {};
    if (content !== undefined) body.content = content;
    if (frontmatter !== undefined) body.frontmatter = frontmatter;

    return this.request(`/notes/${encodeURIComponent(path)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async deleteNote(path: string) {
    return this.request(`/notes/${encodeURIComponent(path)}`, {
      method: "DELETE",
    });
  }

  // Search notes
  async searchNotes(query: string) {
    return this.request(`/notes?search=${encodeURIComponent(query)}`);
  }

  // Metadata endpoints
  async getMetadataKeys() {
    return this.request("/metadata/keys");
  }

  async getMetadataValues(key: string) {
    return this.request(`/metadata/values/${encodeURIComponent(key)}`);
  }
}

// MCP Server implementation
class ObsidianMcpServer {
  private server: Server;
  private client: ObsidianApiClient;

  constructor(config: Config) {
    this.client = new ObsidianApiClient(config);
    this.server = new Server({
      name: "obsidian-vault-mcp",
      version: "1.0.0",
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.setupTools();
  }

  private setupTools() {
    // AI-Native Tools Definition
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Directory Operations
        {
          name: "list_directory",
          description: "List directory contents with pagination to prevent context overflow. Shows immediate contents by default.",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Directory path to list", default: "." },
              recursive: { type: "boolean", description: "Include subdirectories recursively", default: false },
              limit: { type: "number", description: "Maximum items to return", default: 50 },
              offset: { type: "number", description: "Pagination offset", default: 0 },
            },
          },
        },

        // File Operations
        {
          name: "read_file",
          description: "Read content of a specific file from the vault",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to the file" },
            },
            required: ["path"],
          },
        },
        {
          name: "write_file",
          description: "Write file content with different modes: overwrite (default), append, or prepend. Handles both create and update operations.",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to the file" },
              content: { type: "string", description: "Content to write" },
              mode: { type: "string", enum: ["overwrite", "append", "prepend"], description: "Write mode", default: "overwrite" },
            },
            required: ["path", "content"],
          },
        },
        {
          name: "delete_item",
          description: "Delete a file or directory from the vault",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to the item to delete" },
            },
            required: ["path"],
          },
        },

        // AI-Native Note Operations
        {
          name: "create_or_update_note",
          description: "Create or update a note with content and frontmatter. Performs upsert operation - creates if doesn't exist, updates if it does.",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path for the note (without .md extension)" },
              content: { type: "string", description: "Note content" },
              frontmatter: { type: "object", description: "Frontmatter metadata", default: {} },
            },
            required: ["path", "content"],
          },
        },
        {
          name: "get_daily_note",
          description: "Get daily note for a specific date. Handles common daily note naming conventions and file locations.",
          inputSchema: {
            type: "object",
            properties: {
              date: { type: "string", description: "Date (today, yesterday, tomorrow, or YYYY-MM-DD)", default: "today" },
            },
          },
        },
        {
          name: "get_recent_notes",
          description: "Get recently modified notes, ordered by modification time",
          inputSchema: {
            type: "object",
            properties: {
              limit: { type: "number", description: "Number of recent notes to return", default: 5 },
            },
          },
        },

        // Enhanced Search and Discovery
        {
          name: "search_vault",
          description: "Search vault content across files, filenames, and metadata with advanced filtering",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              scope: {
                type: "array",
                items: { type: "string", enum: ["content", "filename", "tags"] },
                description: "Search scope - where to look for the query",
                default: ["content", "filename", "tags"]
              },
              path_filter: { type: "string", description: "Limit search to specific path prefix" },
            },
            required: ["query"],
          },
        },
        {
          name: "find_related_notes",
          description: "Find notes related to a given note based on shared tags, links, or backlinks",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to the source note" },
              on: {
                type: "array",
                items: { type: "string", enum: ["tags", "links"] },
                description: "Relationship criteria to use for finding related notes",
                default: ["tags", "links"]
              },
            },
            required: ["path"],
          },
        },

        // Legacy Tools (for backward compatibility)
        {
          name: "get_note",
          description: "Get a specific note with its content and metadata (legacy)",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to the note" },
            },
            required: ["path"],
          },
        },
        {
          name: "list_notes",
          description: "List all notes in the vault with optional search filter (legacy with search support)",
          inputSchema: {
            type: "object",
            properties: {
              search: { type: "string", description: "Optional search query to filter notes" },
            },
          },
        },
        {
          name: "get_metadata_keys",
          description: "Get all available frontmatter keys from notes",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_metadata_values",
          description: "Get all unique values for a specific frontmatter key",
          inputSchema: {
            type: "object",
            properties: {
              key: { type: "string", description: "Frontmatter key" },
            },
            required: ["key"],
          },
        },
      ],
    }));

    // Tool call handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: any;

        switch (name) {
          // AI-Native Tools
          case "list_directory":
            result = await this.client.listDirectory(
              args?.path as string,
              args?.recursive as boolean,
              args?.limit as number,
              args?.offset as number
            );
            break;

          case "read_file":
            result = await this.client.readFile(args?.path as string);
            break;

          case "write_file":
            result = await this.client.writeFile(
              args?.path as string,
              args?.content as string,
              args?.mode as string
            );
            break;

          case "delete_item":
            result = await this.client.deleteItem(args?.path as string);
            break;

          case "create_or_update_note":
            result = await this.client.createOrUpdateNote(
              args?.path as string,
              args?.content as string,
              args?.frontmatter as Record<string, any>
            );
            break;

          case "get_daily_note":
            result = await this.client.getDailyNote(args?.date as string);
            break;

          case "get_recent_notes":
            result = await this.client.getRecentNotes(args?.limit as number);
            break;

          case "search_vault":
            result = await this.client.searchVault(
              args?.query as string,
              args?.scope as string[],
              args?.path_filter as string
            );
            break;

          case "find_related_notes":
            result = await this.client.findRelatedNotes(
              args?.path as string,
              args?.on as string[]
            );
            break;

          // Legacy Tools (backward compatibility)
          case "list_notes":
            const searchQuery = args?.search as string;
            if (searchQuery) {
              // Use the enhanced search functionality
              result = await this.client.searchVault(searchQuery, ["content", "filename", "tags"]);
            } else {
              result = await this.client.listNotes();
            }
            break;

          case "get_note":
            result = await this.client.getNote(args?.path as string);
            break;

          case "get_metadata_keys":
            result = await this.client.getMetadataKeys();
            break;

          case "get_metadata_values":
            result = await this.client.getMetadataValues(args?.key as string);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Obsidian MCP Server running on stdio");

    // Keep the process alive
    const keepAlive = () => {
      setTimeout(keepAlive, 1000);
    };
    keepAlive();
  }
}

// Main function
async function main() {
  // Read configuration from environment variables
  const config = ConfigSchema.parse({
    baseUrl: process.env.OBSIDIAN_API_URL || "http://obsidian-local-rest-api.test",
    apiKey: process.env.OBSIDIAN_API_KEY,
  });

  const mcpServer = new ObsidianMcpServer(config);
  await mcpServer.start();
}

// Error handling
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

// Run the server if this file is executed directly
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
