# nomi-gc-mcp

An MCP server for creating, modifying, and validating [Nomi.AI](https://nomi.ai) group chats. Scaffold group chat folders, add character Shared Notes, and validate character limits — all from any MCP-compatible client (Cline, Claude Desktop, ChatGPT Desktop, etc.).

## Quick Install

### npx (easiest — no install required)

Add this to your MCP settings file:

```json
{
  "mcpServers": {
    "nomi-gc": {
      "command": "npx",
      "args": ["-y", "nomi-gc-mcp"],
      "disabled": false,
      "autoApprove": [
        "get_formatting_rules",
        "list_group_chats",
        "scaffold_group_chat",
        "add_character",
        "validate_group_chat"
      ]
    }
  }
}
```

`npx` automatically downloads and runs the latest version. No install command, no manual updates.

### Alternative: Global install

```bash
npm install -g nomi-gc-mcp
```

Then configure your MCP client to run:

```json
{
  "mcpServers": {
    "nomi-gc": {
      "command": "nomi-gc",
      "disabled": false,
      "autoApprove": ["get_formatting_rules", "list_group_chats", "scaffold_group_chat", "add_character", "validate_group_chat"]
    }
  }
}
```

### Alternative: From source

Clone [github.com/spacegoblins/nomi-gc-server](https://github.com/spacegoblins/nomi-gc-server), then run `npm install && npm run build` and point your MCP client to `build/index.js`.

## Where to find your MCP settings

| Client | Settings Location |
|--------|------------------|
| **Cline** | `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json` |
| **Claude Desktop** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **ChatGPT Desktop** | `%APPDATA%\ChatGPT\chatgpt_mcp_config.json` |
| **Continue** | `.continuum.json` in your project root |

## Important: Always pass `working_directory`

All filesystem tools require a `working_directory` parameter pointing to your active workspace. The AI agent should detect this automatically from your environment — but if it doesn't, the tool will error out with a clear message rather than creating files in the wrong place.

## Tools

| Tool | Description |
|------|-------------|
| `get_formatting_rules` | Returns the full formatting spec: section names, max character counts, mind-map categories, third-person rule. |
| `list_group_chats` | Lists all group chat folders in a directory with character counts. |
| `scaffold_group_chat` | Creates a new group chat folder with `README.md`, `settings.md`, `mind-map.md`, and blank character `*_Shared_Notes.md` files. |
| `add_character` | Adds a single character's Shared Notes to an existing group chat. |
| `validate_group_chat` | Validates one or all group chats against character limits and required sections. |

### Example

```
scaffold_group_chat({
  name: "My Cool World",
  characters: ["Alice", "Bob"],
  working_directory: "C:\\Users\\You\\Documents\\Nomi Groupchats"
})
```

## Resources

| URI | Content |
|-----|---------|
| `nomi-gc://rules/overview` | What group chats are, file anatomy, character limits table |
| `nomi-gc://rules/formatting` | Formatting rules: third-person, proper nouns, mind-map categories |
| `nomi-gc://rules/character-limits` | Exact 10-section character limit table as structured JSON |
| `nomi-gc://guides/ai-prompting` | How an AI should use these tools creatively |

## License

MIT

## Links

- GitHub: [github.com/spacegoblins/nomi-gc-server](https://github.com/spacegoblins/nomi-gc-server)
- npm: [npmjs.com/package/nomi-gc-mcp](https://npmjs.com/package/nomi-gc-mcp)