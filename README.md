# nomi-gc-mcp

An MCP server for creating, modifying, and validating [Nomi.AI](https://nomi.ai) group chats. Scaffold group chat folders, add character Shared Notes, and validate character limits — all from any MCP-compatible client (Cline, Claude Desktop, ChatGPT Desktop, etc.), so you never have to touch a text editor.

## How to Use This MCP

Once installed, your AI assistant (Cline, Claude Desktop, ChatGPT Desktop, etc.) has access to five tools that handle all the heavy lifting of Nomi.AI group chat creation and validation. You describe what you want in plain language, the assistant calls the tools, and you get a fully structured group chat folder with character Shared Notes ready to upload (you can use my other tool to automatically upload shared notes: [Nomi.AI Shared Notes Extractor](https://addons.mozilla.org/en-US/firefox/addon/nomi-ai-shared-notes-extractor/)).

### Example prompts

Try these prompts with your assistant after the MCP is installed:

**Scaffold a new group chat from scratch:**

> Create a new Nomi group chat called "Space Station Copernicus" with characters: Captain Vega, Dr. Aris Thorne, and Echo-7, a witty maintenance android.

The assistant calls `scaffold_group_chat` to create the folder structure, then `add_character` for each character. You get a summary of what was created.

**Add a character to an existing group:**

> Add a character named "Kaelen" to my "Space Station Copernicus" group chat. He's a rogue trader with a cybernetic eye.

**Check character limits before uploading:**

> Validate all my group chats to make sure nothing exceeds the character limits.

The assistant calls `validate_group_chat` and reports any sections that are over the character limit.

**Get the formatting rules:**

> Show me the Nomi group chat formatting rules for writing Shared Notes.

The assistant calls `get_formatting_rules` and displays the full spec.

### What you get

After scaffolding or adding characters, your group chat folder looks like this:

```
My Cool World/
├── README.md
├── settings.md
├── mind-map.md
├── characters/
│   ├── Alice_Shared_Notes.md
│   └── Bob_Shared_Notes.md
```

Each `*_Shared_Notes.md` file contains the correct Nomi.AI section headers. Your assistant fills in the notes based on your descriptions — personality, appearance, backstory, voice, etc.

### Uploading to Nomi.AI

**Nomi Shared Notes (manual):**
1. Go to [nomi.ai](https://nomi.ai) open the Shared Notes of the Nomi you want to modify
2. Navigate to each section, pasting in the contents of the `_Shared_Notes.md` file that your agent created
3. Remember to hit Save and to resolve any over-the-limit character issues.

**Nomi Shared Notes (Automatic via Firefox Extension):**
1. Install my Firefox extension by visiting [this link.](https://addons.mozilla.org/en-US/firefox/addon/nomi-ai-shared-notes-extractor/)
2. Navigate to your Nomi's Shared Notes page
3. Click 'Import' in the header, and then select the shared notes file to upload
4. Remember to hit save on the categories with changes, and resolve and over-the-limit character issues.

**Group Chat Settings (Backstory, Current Roleplay, Mind Map):**
1. Navigate to an existing Group Chat settings page (Or create a new group chat)
2. Copy the Backstory from `settings.md` and paste it in
3. Copy the Current Roleplay from `settings.md` and paste it in
4. Navigate to your Group Chat's Mind Map
5. For each item in your `mind-map.md`, click the 'Add' button and paste the relevant content

There is no way to avoid a bit of manual setup once your new world is ready to import - but the payout is great. You're starting a group chat with a ton of lore already built in - no awkward messages where you have to try and teach your Nomi's about the world you've been imagining.

## Installation

### 1. Ask an Agent to Install This MCP

Copy and paste the following into your AI assistant (e.g. Cline, Claude Desktop, ChatGPT Desktop, or any AI assistant that supports MCP):

```
I need to install the "nomi-gc-mcp" MCP server. Please:

1. Detect which application I'm running in (Cline, Claude Desktop, ChatGPT Desktop, Continue, or other).
2. Locate the correct MCP settings file for that client:
   - Cline: %APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
   - Claude Desktop: %APPDATA%\Claude\claude_desktop_config.json
   - ChatGPT Desktop: %APPDATA%\ChatGPT\chatgpt_mcp_config.json
   - Continue: .continuum.json in the project root
3. Read the file if it exists.
4. Add or merge the following entry into the "mcpServers" object:

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

5. Create the file with the full object if it doesn't exist yet.
6. Tell me the file was updated and ask me to restart/reload my MCP client.
```

The agent will handle everything — no need to open config files, run install commands, or copy JSON manually.

### 2. Manual Installation

#### npx (recommended — no install required)

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

#### Global install

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

#### From source

Clone [github.com/spacegoblins/nomi-gc-server](https://github.com/spacegoblins/nomi-gc-server), then run `npm install && npm run build` and point your MCP client to `build/index.js`.

### Where to find your MCP settings

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