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
  OBSIDIAN_API_URL    Base URL for Obsidian REST API (default: http://localhost:8000)
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
  baseUrl: z.string().url().default("http://localhost:8000"),
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

  // Files endpoints
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
    // List all files in vault
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "list_files",
          description: "List all files in the Obsidian vault",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_file",
          description: "Get content of a specific file from the vault",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to the file" },
            },
            required: ["path"],
          },
        },
        {
          name: "create_file",
          description: "Create a new file in the vault",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path for the new file" },
              content: { type: "string", description: "Content of the file" },
              type: { type: "string", enum: ["file", "directory"], description: "Type of item to create" },
            },
            required: ["path", "content"],
          },
        },
        {
          name: "update_file",
          description: "Update content of an existing file",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to the file" },
              content: { type: "string", description: "New content of the file" },
            },
            required: ["path", "content"],
          },
        },
        {
          name: "delete_file",
          description: "Delete a file from the vault",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to the file to delete" },
            },
            required: ["path"],
          },
        },
        {
          name: "list_notes",
          description: "List all notes in the vault with metadata",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_note",
          description: "Get a specific note with its content and metadata",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to the note" },
            },
            required: ["path"],
          },
        },
        {
          name: "create_note",
          description: "Create a new note with optional frontmatter",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path for the new note" },
              content: { type: "string", description: "Content of the note" },
              frontmatter: { type: "object", description: "Optional frontmatter metadata" },
            },
            required: ["path", "content"],
          },
        },
        {
          name: "update_note",
          description: "Update a note's content and/or frontmatter",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to the note" },
              content: { type: "string", description: "New content (optional)" },
              frontmatter: { type: "object", description: "New frontmatter (optional)" },
            },
            required: ["path"],
          },
        },
        {
          name: "delete_note",
          description: "Delete a note from the vault",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to the note to delete" },
            },
            required: ["path"],
          },
        },
        {
          name: "search_notes",
          description: "Search notes by content or metadata",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
            },
            required: ["query"],
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
          case "list_files":
            result = await this.client.listFiles();
            break;

          case "get_file":
            result = await this.client.getFile(args?.path as string);
            break;

          case "create_file":
            result = await this.client.createFile(
              args?.path as string,
              args?.content as string,
              args?.type as "file" | "directory"
            );
            break;

          case "update_file":
            result = await this.client.updateFile(args?.path as string, args?.content as string);
            break;

          case "delete_file":
            result = await this.client.deleteFile(args?.path as string);
            break;

          case "list_notes":
            result = await this.client.listNotes();
            break;

          case "get_note":
            result = await this.client.getNote(args?.path as string);
            break;

          case "create_note":
            result = await this.client.createNote(
              args?.path as string,
              args?.content as string,
              args?.frontmatter as Record<string, any>
            );
            break;

          case "update_note":
            result = await this.client.updateNote(
              args?.path as string,
              args?.content as string,
              args?.frontmatter as Record<string, any>
            );
            break;

          case "delete_note":
            result = await this.client.deleteNote(args?.path as string);
            break;

          case "search_notes":
            result = await this.client.searchNotes(args?.query as string);
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
    baseUrl: process.env.OBSIDIAN_API_URL || "http://localhost:8000",
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
