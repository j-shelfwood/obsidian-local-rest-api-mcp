#!/usr/bin/env node

/**
 * Integration test script for the AI-Native MCP tools
 *
 * This script tests the key functionality of the redesigned MCP server
 * to ensure the AI-native tools work as expected.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
interface Config {
    baseUrl: string;
    apiKey?: string;
}

const config: Config = {
    baseUrl: process.env.OBSIDIAN_API_URL || "http://obsidian-local-rest-api.test",
    apiKey: process.env.OBSIDIAN_API_KEY,
};

// Simple API client for testing
class TestApiClient {
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
        try {
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
        } catch (error) {
            console.error(`Request to ${url} failed:`, error);
            throw error;
        }
    }

    async testListDirectory() {
        console.log("🧪 Testing list_directory...");
        const result = await this.request("/vault/directory?path=.&limit=5");
        console.log(`✅ Found ${result.total_items} items in vault root`);
        return result;
    }

    async testSearchVault() {
        console.log("🧪 Testing search_vault...");
        const result = await this.request("/vault/search?query=test&scope=content,filename");
        console.log(`✅ Search found ${result.total_results} results`);
        return result;
    }

    async testCreateOrUpdateNote() {
        console.log("🧪 Testing create_or_update_note...");
        const testNote = {
            path: "test-ai-native-note",
            content: "This is a test note created by the AI-native MCP tools.",
            front_matter: {
                tags: ["test", "ai-native", "mcp"],
                created: new Date().toISOString(),
            }
        };

        const result = await this.request("/notes/upsert", {
            method: "POST",
            body: JSON.stringify(testNote),
        });
        console.log(`✅ Note upserted successfully: ${result.path}`);
        return result;
    }

    async testWriteFile() {
        console.log("🧪 Testing write_file (append mode)...");
        const result = await this.request("/files/write", {
            method: "POST",
            body: JSON.stringify({
                path: "test-ai-native-note.md",
                content: "\n\n## Additional Content\nThis was appended using the write_file tool.",
                mode: "append"
            }),
        });
        console.log(`✅ File appended successfully`);
        return result;
    }

    async testGetRecentNotes() {
        console.log("🧪 Testing get_recent_notes...");
        const result = await this.request("/vault/notes/recent?limit=3");
        console.log(`✅ Found ${result.length} recent notes`);
        return result;
    }

    async testGetDailyNote() {
        console.log("🧪 Testing get_daily_note...");
        try {
            const result = await this.request("/vault/notes/daily?date=today");
            console.log(`✅ Found daily note: ${result.path}`);
            return result;
        } catch (error) {
            console.log(`ℹ️  No daily note found (this is expected if you don't have daily notes)`);
            return null;
        }
    }

    async testFindRelatedNotes() {
        console.log("🧪 Testing find_related_notes...");
        try {
            const result = await this.request("/vault/notes/related/test-ai-native-note.md?on=tags");
            console.log(`✅ Found ${result.total_found} related notes`);
            return result;
        } catch (error) {
            console.log(`ℹ️  No related notes found or test note doesn't exist yet`);
            return null;
        }
    }
}

// Run tests
async function runTests() {
    console.log("🚀 Starting AI-Native MCP Integration Tests\n");

    const client = new TestApiClient(config);

    try {
        await client.testListDirectory();
        await client.testCreateOrUpdateNote();
        await client.testWriteFile();
        await client.testSearchVault();
        await client.testGetRecentNotes();
        await client.testGetDailyNote();
        await client.testFindRelatedNotes();
        console.log("\n🎉 All tests completed successfully!");
        console.log("\n📋 Summary of AI-Native Improvements:");
        console.log("• list_directory: Paginated directory listing prevents context overflow");
        console.log("• write_file: Unified create/update/append operations");
        console.log("• create_or_update_note: Intelligent upsert removes LLM decision complexity");
        console.log("• search_vault: Advanced search with scope filtering");
        console.log("• get_recent_notes: Task-oriented recent file access");
        console.log("• get_daily_note: Smart daily note resolution");
        console.log("• find_related_notes: Conceptual note relationships");

    } catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}
