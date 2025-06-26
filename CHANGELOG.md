# Changelog

## [1.1.0] - 2024-12-26

### 🧠 Major: AI-Native Redesign

This release represents a complete philosophical shift from CRUD-based API mappings to truly AI-native, task-oriented tools designed for LLM workflows.

#### ✨ New AI-Native Tools

- **`list_directory`** - Paginated directory listing prevents context overflow
- **`write_file`** - Unified create/update/append operations with mode parameter
- **`create_or_update_note`** - Intelligent upsert eliminates existence checks
- **`search_vault`** - Multi-scope search with advanced filtering (content, filename, tags)
- **`get_daily_note`** - Smart daily note resolution with common naming patterns
- **`get_recent_notes`** - Task-oriented recent file access
- **`find_related_notes`** - Conceptual relationship discovery via tags and links

#### 🔧 Enhanced Backend API

- New `/api/vault/*` endpoints for high-level operations
- Enhanced `/api/files/write` with multi-mode support
- Enhanced `/api/notes/upsert` for intelligent create/update
- Advanced search and relationship discovery endpoints

#### 📊 Performance Improvements

- **Context Efficiency**: Pagination prevents LLM context overflow
- **Decision Reduction**: Upsert operations eliminate existence checks
- **Cognitive Alignment**: Tools match natural language concepts

#### 🔄 Backward Compatibility

- All existing tools (`get_note`, `list_notes`, etc.) remain functional
- Legacy endpoints preserved for existing integrations
- Gradual migration path available

#### 🏗 Architecture

- New `VaultController` for high-level vault operations
- Enhanced `FileController` and `NoteController`
- Improved `LocalVaultService` with additional file system methods

### Breaking Changes

None - this release maintains full backward compatibility while adding the new AI-native capabilities.

### Migration Guide

Existing integrations continue to work unchanged. To take advantage of AI-native features:

1. Use `list_directory` instead of `list_files` for large vaults
2. Replace `create_file`/`update_file` pairs with single `write_file` calls
3. Use `create_or_update_note` for reliable note operations
4. Leverage `search_vault` for precise, scoped searches

---

## [1.0.3] - Previous Release

Legacy CRUD-based implementation with basic file and note operations.
