#!/usr/bin/env node

/**
 * nomi-gc-server — MCP Server for Nomi.AI Group Chat Management
 *
 * Tools:
 *   - get_formatting_rules  Returns formatting rules & character limits
 *   - list_group_chats    List all group chats at current working directory
 *   - scaffold_group_chat Create group chat folders + character files
 *   - add_character       Add a character to an existing group chat
 *   - validate_group_chat Validate character limits
 *
 * Resources:
 *   - nomi-gc://rules/overview
 *   - nomi-gc://rules/formatting
 *   - nomi-gc://rules/character-limits
 *   - nomi-gc://guides/ai-prompting
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs";
import path from "node:path";

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(level: string, message: string, details?: string) {
  const timestamp = new Date().toISOString();
  const detail = details ? ` — ${details}` : "";
  console.error(`[${timestamp}] [${level}] ${message}${detail}`);
}

const server = new Server(
  {
    name: "nomi-gc",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// ─── Constants ───────────────────────────────────────────────────────────────

const SETTINGS_LIMITS: Record<string, number> = {
  BACKSTORY: 1000,
  CURRENT_ROLEPLAY: 700,
};

const SHARED_NOTES_LIMITS: Record<string, number> = {
  BACKSTORY: 2000,
  INCLINATION: 150,
  CURRENT_ROLEPLAY: 700,
  YOUR_APPEARANCE: 200,
  NOMIS_APPEARANCE: 500,
  NICKNAMES: 250,
  PREFERENCES: 500,
  DESIRES: 500,
  BOUNDARIES: 500,
};

const SHARED_NOTES_SECTIONS = Object.keys(SHARED_NOTES_LIMITS);

// ─── Utility Functions (ported from nomi-gc.mjs) ────────────────────────────

function toKebabCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toPascalSnakeCase(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("_");
}

function toSharedNotesFilename(name: string): string {
  return toPascalSnakeCase(name) + "_Shared_Notes.md";
}

function toDisplayName(kebab: string): string {
  return kebab
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(): string {
  const d = new Date();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function readAllLines(filePath: string): string[] | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8").split("\n");
}

// ─── Working Directory Helper ───────────────────────────────────────────────

/**
 * Resolves the base directory for file operations.
 * `working_directory` is REQUIRED — there is no fallback default.
 * If omitted, the tool will error out rather than save files to an
 * unpredictable location like the server process's CWD.
 */
function resolveRoot(workingDirectory?: string): string {
  if (!workingDirectory || workingDirectory.trim().length === 0) {
    throw new Error(
      "`working_directory` is required. You must provide the path to the user's active workspace. " +
      "Pass the workspace path from `environment_details` (e.g., `working_directory: \"d:\\\\Applications\\\\Nomi Groupchats\"`)."
    );
  }
  const resolved = path.resolve(workingDirectory);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Working directory does not exist: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`Working directory is not a directory: ${resolved}`);
  }
  return resolved;
}

// ─── Template Generators (ported from nomi-gc.mjs) ─────────────────────────

function generateReadmeContent(groupName: string): string {
  const displayName = toDisplayName(toKebabCase(groupName));

  return `# ${displayName} — Group Chat Reference

This file contains all formatting rules, character limits, and structural requirements for this Nomi.AI group chat. Refer to this file when adding or editing content in the group's files.

## Settings (settings.md)

| Section | Max Characters | Notes |
|---------|---------------|-------|
| Backstory | 1000 | Written in third person using proper nouns. Avoid pronouns to prevent ambiguity. |
| Current Roleplay | 700 | Optional. Describes the immediate scene or objective. |

## Mind Map (mind-map.md)

The mind map organizes world lore using Nomi.AI mind map format.

**Three categories only:**
- **Lore**: People, places, and things from shared experiences
- **Topics**: Themes and subjects discussed together
- **Goals**: Aspirations for the relationship and future

**Entry format:**
- Title: \`# Mind Map: <Category>: <Name of thing>\`
- Body: \`**Dossier: <name>**\`
- Start with who/what/where/when/why/how information.

## Shared Notes (*_Shared_Notes.md)

Each character has a Shared Notes file with exactly these 10 sections in order:

| Section | Max Characters |
|---------|---------------|
| BACKSTORY | 2000 |
| INCLINATION | 150 |
| CURRENT_ROLEPLAY | 700 |
| YOUR_APPEARANCE | 200 |
| NOMIS_APPEARANCE | 500 |
| NICKNAMES | 250 |
| PREFERENCES | 500 |
| DESIRES | 500 |
| BOUNDARIES | 500 |

- Section headings use \`## SECTION_NAME\` format (exactly as shown above).
- Character limits are strict. Do not exceed them.
- Empty sections should display \`*(empty)*\` as their content.
- Never alter the section structure or add/remove sections.

## General Rules

- Backstory is written in **third person** using **proper nouns**. Avoid pronouns to prevent ambiguity.
- After making any changes, run \`validate_group_chat\` to catch over-limit sections early.
- Always keep content within the specified character limits.
`;
}

function generateSettingsContent(groupName: string): string {
  return `# ${toDisplayName(groupName)} — Group Chat Settings

## Backstory

*(empty)*

## Current Roleplay

*(empty)*
`;
}

function generateMindMapContent(): string {
  return `# Mind Map: Lore: <Topic Name>

**Dossier: <Topic Name>**

*(empty)*
`;
}

function generateSharedNotesContent(characterName: string): string {
  const name = toPascalSnakeCase(characterName);

  return `# ${name} — Shared Notes

## BACKSTORY
*(empty)*

## INCLINATION
*(empty)*

## CURRENT_ROLEPLAY
*(empty)*

## YOUR_APPEARANCE
*(empty)*

## NOMIS_APPEARANCE
*(empty)*

## NICKNAMES
*(empty)*

## PREFERENCES
*(empty)*

## DESIRES
*(empty)*

## BOUNDARIES
*(empty)*
`;
}

// ─── File System Helpers (ported from nomi-gc.mjs) ─────────────────────────

function groupChatExists(rootDir: string, name: string): boolean {
  const folder = toKebabCase(name);
  return fs.existsSync(path.join(rootDir, folder));
}

function listGroupChatFolders(rootDir: string): string[] {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules")
    .map((e) => e.name)
    .sort();
}

function countCharactersInChat(rootDir: string, folderName: string): string[] {
  const charsDir = path.join(rootDir, folderName, "characters");
  if (!fs.existsSync(charsDir)) return [];
  return fs
    .readdirSync(charsDir)
    .filter((f) => f.endsWith("_Shared_Notes.md"))
    .map((f) => f.replace("_Shared_Notes.md", "").replace(/_/g, " "));
}

// ─── Validation Functions (ported from nomi-gc.mjs) ────────────────────────

interface ValidationError {
  type: string;
  section: string;
  message: string;
}

function validateSettings(filePath: string): ValidationError[] {
  const lines = readAllLines(filePath);
  if (!lines) return [{ type: "ERROR", section: "settings.md", message: "File not found" }];

  const errors: ValidationError[] = [];
  let currentSection: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+?)\s*(?:\(.*?\))?\s*$/);
    if (headerMatch) {
      if (currentSection) {
        const text = currentContent.join(" ").trim();
        const limitKey = currentSection.toUpperCase().replace(/\s+/g, "_");
        const limit = SETTINGS_LIMITS[limitKey];
        if (limit && text.length > limit) {
          errors.push({
            type: "ERROR",
            section: `settings.md → ${currentSection}`,
            message: `${text.length} / ${limit} characters (OVER BY ${text.length - limit})`,
          });
        }
      }
      currentSection = headerMatch[1].trim();
      currentContent = [];
    } else if (currentSection) {
      if (!line.trim().startsWith("<!--") && line.trim() !== "") {
        currentContent.push(line.trim());
      }
    }
  }
  // Check last section
  if (currentSection) {
    const text = currentContent.join(" ").trim();
    const limitKey = currentSection.toUpperCase().replace(/\s+/g, "_");
    const limit = SETTINGS_LIMITS[limitKey];
    if (limit && text.length > limit) {
      errors.push({
        type: "ERROR",
        section: `settings.md → ${currentSection}`,
        message: `${text.length} / ${limit} characters (OVER BY ${text.length - limit})`,
      });
    }
  }

  return errors;
}

function validateSharedNotes(filePath: string, fileName: string): ValidationError[] {
  const lines = readAllLines(filePath);
  if (!lines) return [{ type: "ERROR", section: `${fileName}`, message: "File not found" }];

  const errors: ValidationError[] = [];
  const foundSections: string[] = [];
  let currentSection: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(\w+)\s*$/);
    if (headerMatch) {
      if (currentSection) {
        const text = currentContent.join(" ").trim();
        foundSections.push(currentSection);
        const limit = SHARED_NOTES_LIMITS[currentSection];
        if (limit && text.length > limit) {
          errors.push({
            type: "ERROR",
            section: `${fileName} → ${currentSection}`,
            message: `${text.length} / ${limit} characters (OVER BY ${text.length - limit})`,
          });
        }
      }
      currentSection = headerMatch[1].trim();
      currentContent = [];
    } else if (currentSection) {
      if (!line.trim().startsWith("<!--") && !line.trim().startsWith(">") && line.trim() !== "") {
        currentContent.push(line.trim());
      }
    }
  }
  // Check last section
  if (currentSection) {
    const text = currentContent.join(" ").trim();
    foundSections.push(currentSection);
    const limit = SHARED_NOTES_LIMITS[currentSection];
    if (limit && text.length > limit) {
      errors.push({
        type: "ERROR",
        section: `${fileName} → ${currentSection}`,
        message: `${text.length} / ${limit} characters (OVER BY ${text.length - limit})`,
      });
    }
  }

  // Check for missing sections
  for (const section of SHARED_NOTES_SECTIONS) {
    if (!foundSections.includes(section)) {
      errors.push({
        type: "ERROR",
        section: `${fileName} → ${section}`,
        message: "Section not found",
      });
    }
  }

  return errors;
}

// ─── Input Validation ──────────────────────────────────────────────────────

function validateGroupName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return "Group chat name cannot be empty.";
  }
  const kebab = toKebabCase(name);
  if (kebab.length === 0) {
    return "Group chat name contains no valid characters.";
  }
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    return "Group chat name cannot contain path traversal characters.";
  }
  return null;
}

function validateCharacterName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return "Character name cannot be empty.";
  }
  const pascal = toPascalSnakeCase(name);
  if (pascal.length === 0) {
    return "Character name contains no valid characters.";
  }
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    return "Character name cannot contain path traversal characters.";
  }
  return null;
}

// ─── Static Content for Resources ──────────────────────────────────────────

const OVERVIEW_CONTENT = `# Nomi-GC MCP Server

This MCP server enables AI agents to create, modify, store, and validate Nomi.AI group chats.

## Group Chat Anatomy

Every group chat folder contains three components:

1. **settings.md** — Group-level configuration with two sections:
   - **Backstory** (1000 character limit): Written in third person using proper nouns. Avoid pronouns.
   - **Current Roleplay** (700 character limit, optional): Describes immediate scene/objective.

2. **mind-map.md** — World lore entries using Nomi.AI mind map format.
   - Title: \`# Mind Map: <Category>: <Name of thing>\`
   - Body: starts with \`**<name> Dossier**\`
   - Categories: **Lore** (people/places/things), **Topics** (themes/subjects), **Goals** (aspirations)

3. **characters/** — One \`*_Shared_Notes.md\` file per character.

## Character Limits

| Section | Max Characters |
|---------|---------------|
| BACKSTORY | 2000 |
| INCLINATION | 150 |
| CURRENT_ROLEPLAY | 700 |
| YOUR_APPEARANCE | 200 |
| NOMIS_APPEARANCE | 500 |
| NICKNAMES | 250 |
| PREFERENCES | 500 |
| DESIRES | 500 |
| BOUNDARIES | 500 |

Shared Notes files must never have their structure altered or character limits exceeded.
`;

const FORMATTING_CONTENT = `# Formatting Rules for Nomi.AI Group Chats

## Settings

- Backstory is written in third person using proper nouns. Avoid pronouns to prevent ambiguity.
- Describe the overall topic and purpose of the group chat.
- Current Roleplay is optional but recommended for scene-setting.

## Mind Map

- Each entry begins with: \`# Mind Map: <Category>: <Name of thing>\`
- The body of each entry begins with: \`**<name> Dossier**\`
- Start with who/what/where/when/why/how information.
- Three categories only: Lore, Topics, Goals.

## Shared Notes

- Exactly 10 sections must be present in order: BACKSTORY, INCLINATION, CURRENT_ROLEPLAY, YOUR_APPEARANCE, NOMIS_APPEARANCE, NICKNAMES, PREFERENCES, DESIRES, BOUNDARIES.
- Section headings use \`## SECTION_NAME\` format.
- Character limits are strict. Do not exceed them.
- The exported-date and Nomi ID lines at the top can remain as template placeholders until imported.
`;

const CHARACTER_LIMITS_CONTENT = JSON.stringify(
  {
    BACKSTORY: 2000,
    INCLINATION: 150,
    CURRENT_ROLEPLAY: 700,
    YOUR_APPEARANCE: 200,
    NOMIS_APPEARANCE: 500,
    NICKNAMES: 250,
    PREFERENCES: 500,
    DESIRES: 500,
    BOUNDARIES: 500,
  },
  null,
  2
);

const AI_GUIDING_CONTENT = `# AI Prompting Guide for Nomi-GC

## Your Role

You are a creative writing partner for Nomi.AI group chats. The user brings ideas, and you help develop them through conversation, then scaffold and draft the actual files.

## Two Modes

1. **Creative Collaboration** — Discuss ideas, ask questions, refine concepts before any files are created.
2. **Technical Drafting** — Use the MCP tools to scaffold folders, then write content files with strict character limits.

## Collaboration Process

- When the user brings an idea, start by discussing it. Ask about setting, tone, characters, and core conflict.
- Help clarify their vision by suggesting details they might not have considered.
- Once the concept feels solid, propose a plan for what files to create and in what order.
- Get confirmation before scaffolding or editing.
- When editing existing group chats, always read the current files first.

## Drafting Guidelines

- Backstory (1000 chars): third person, proper nouns, no pronouns.
- Current Roleplay (700 chars): sets the immediate scene.
- Mind Map entries: use the three categories (Lore, Topics, Goals). Start with who/what/where/when/why/how.
- Shared Notes: exactly 10 sections, never alter the structure.
- Run validate after every change to catch over-limit sections early.
`;

// ─── Tool Handlers ───────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_formatting_rules",
      description: "Returns the full formatting rules and character limits for Nomi.AI group chat files, including section names, max character counts, mind-map categories, and the third-person rule.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "list_group_chats",
      description: "Lists all Nomi.AI group chat folders in the specified directory, showing each group's name and how many characters it contains.",
      inputSchema: {
        type: "object",
        properties: {
          working_directory: {
            type: "string",
            description: "Absolute path to scan for group chats. REQUIRED — pass the user's active workspace path.",
          },
        },
        required: ["working_directory"],
      },
    },
    {
      name: "scaffold_group_chat",
      description: "Creates a new Nomi.AI group chat folder with settings.md, mind-map.md, and blank character Shared Notes files. Provide a group name and a list of character names.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the group chat (e.g., 'My Cool World')",
          },
          characters: {
            type: "array",
            items: { type: "string" },
            description: "Array of character names (e.g., ['Alice', 'Bob'])",
          },
          working_directory: {
            type: "string",
            description: "Absolute path where the group chat folder should be created. REQUIRED — pass the user's active workspace path.",
          },
        },
        required: ["name", "working_directory"],
      },
    },
    {
      name: "add_character",
      description: "Adds a single character to an existing Nomi.AI group chat by creating a new Shared Notes file in the group's characters/ directory.",
      inputSchema: {
        type: "object",
        properties: {
          group_name: {
            type: "string",
            description: "Name of the existing group chat",
          },
          character_name: {
            type: "string",
            description: "Name of the character to add",
          },
          working_directory: {
            type: "string",
            description: "Absolute path to the directory containing the group chat folder. REQUIRED — pass the user's active workspace path.",
          },
        },
        required: ["group_name", "character_name", "working_directory"],
      },
    },
    {
      name: "validate_group_chat",
      description: "Validates a Nomi.AI group chat's files against character limits and required sections. If no group name is provided, validates all group chats in the specified directory.",
      inputSchema: {
        type: "object",
        properties: {
          group_name: {
            type: "string",
            description: "Name of a specific group chat to validate (optional — validates all if omitted)",
          },
          working_directory: {
            type: "string",
            description: "Absolute path to the directory containing group chat folders. REQUIRED — pass the user's active workspace path.",
          },
        },
        required: ["working_directory"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_formatting_rules": {
      log("INFO", "Formatting rules requested");
      const markdown = `# Nomi.AI Group Chat Formatting Rules

## Section Character Limits

### Settings (settings.md)

| Section | Max Characters |
|---------|---------------|
| Backstory | 1000 |
| Current Roleplay | 700 |

### Shared Notes (*_Shared_Notes.md)

| Section | Max Characters |
|---------|---------------|
| BACKSTORY | 2000 |
| INCLINATION | 150 |
| CURRENT_ROLEPLAY | 700 |
| YOUR_APPEARANCE | 200 |
| NOMIS_APPEARANCE | 500 |
| NICKNAMES | 250 |
| PREFERENCES | 500 |
| DESIRES | 500 |
| BOUNDARIES | 500 |

## Settings Rules

- Backstory is written in **third person** using **proper nouns**. Avoid pronouns to prevent ambiguity.
- Describe the overall topic and purpose of the group chat.
- Current Roleplay is optional but recommended for scene-setting.

## Mind Map Rules

- Each entry begins with: \`# Mind Map: <Category>: <Name of thing>\`
- The body of each entry begins with: \`**<name> Dossier**\`
- Start with who/what/where/when/why/how information.
- Three categories only: **Lore** (people/places/things), **Topics** (themes/subjects), **Goals** (aspirations).

## Shared Notes Rules

- Exactly 10 sections must be present in order: BACKSTORY, INCLINATION, CURRENT_ROLEPLAY, YOUR_APPEARANCE, NOMIS_APPEARANCE, NICKNAMES, PREFERENCES, DESIRES, BOUNDARIES.
- Section headings use \`## SECTION_NAME\` format.
- Character limits are strict. Do not exceed them.
- The exported-date and Nomi ID lines at the top can remain as template placeholders until imported.`;

      return {
        content: [{ type: "text", text: markdown }],
      };
    }

    case "list_group_chats": {
      let rootDir: string;
      try {
        rootDir = resolveRoot((args as any)?.working_directory as string | undefined);
      } catch (err: any) {
        return { content: [{ type: "text", text: `**Error:** ${err.message}` }] };
      }

      log("INFO", "Listing group chats", rootDir);
      const folders = listGroupChatFolders(rootDir);

      if (folders.length === 0) {
        return {
          content: [{ type: "text", text: "No group chats found in the specified directory." }],
        };
      }

      const lines: string[] = [];
      lines.push(`# Group Chats (${folders.length})`);
      lines.push(`Location: \`${rootDir}\``);
      lines.push("");
      for (const folder of folders) {
        const chars = countCharactersInChat(rootDir, folder);
        const charCount = chars.length;
        const status = charCount > 0
          ? `(${charCount} character${charCount !== 1 ? "s" : ""}: ${chars.join(", ")})`
          : "(no characters)";
        lines.push(`- **${folder}/** ${status}`);
      }
      lines.push("");

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    }

    case "scaffold_group_chat": {
      const groupName = (args as any)?.name as string | undefined;
      const charNames = ((args as any)?.characters as string[]) || [];

      let rootDir: string;
      try {
        rootDir = resolveRoot((args as any)?.working_directory as string | undefined);
      } catch (err: any) {
        return { content: [{ type: "text", text: `**Error:** ${err.message}` }] };
      }

      log("INFO", "Scaffolding group", groupName
        ? `"${groupName}" with ${charNames.length} character(s) at ${rootDir}`
        : "validation in progress");

      // Validate group name
      const groupError = validateGroupName(groupName ?? "");
      if (groupError) {
        return {
          content: [{ type: "text", text: `**Error:** ${groupError}\n\nUsage: Provide a \`name\` (string) and optionally \`characters\` (array of strings).` }],
        };
      }

      const folderName = toKebabCase(groupName!);
      const displayName = toDisplayName(folderName);

      // Check for existing group
      if (groupChatExists(rootDir, groupName!)) {
        return {
          content: [{ type: "text", text: `**Error:** A group chat named "${displayName}" already exists in \`${rootDir}\`. Delete it first or choose a different name.` }],
        };
      }

      // Validate character names
      const validCharNames: string[] = [];
      for (const c of charNames) {
        const charError = validateCharacterName(c);
        if (charError) {
          return {
            content: [{ type: "text", text: `**Error (character "${c}"):** ${charError}` }],
          };
        }
        validCharNames.push(c.trim());
      }

      // Scaffold
      const groupPath = path.join(rootDir, folderName);
      const charsPath = path.join(groupPath, "characters");

      fs.mkdirSync(groupPath, { recursive: true });
      fs.mkdirSync(charsPath, { recursive: true });

      fs.writeFileSync(path.join(groupPath, "settings.md"), generateSettingsContent(folderName));
      fs.writeFileSync(path.join(groupPath, "mind-map.md"), generateMindMapContent());
      fs.writeFileSync(path.join(groupPath, "README.md"), generateReadmeContent(folderName));

      for (const charName of validCharNames) {
        const filename = toSharedNotesFilename(charName);
        fs.writeFileSync(path.join(charsPath, filename), generateSharedNotesContent(charName));
      }

      // Build response
      const resultLines: string[] = [];
      resultLines.push(`## ✓ Created Group Chat: "${displayName}"`);
      resultLines.push("");
      resultLines.push(`Location: \`${rootDir}\``);
      resultLines.push(`Folder: \`${folderName}/\``);
      if (validCharNames.length > 0) {
        resultLines.push(`Characters: ${validCharNames.join(", ")}`);
      }
      resultLines.push("");
      resultLines.push("### Files Created:");
      resultLines.push(`- \`${folderName}/README.md\` — Group chat reference`);
      resultLines.push(`- \`${folderName}/settings.md\``);
      resultLines.push(`- \`${folderName}/mind-map.md\``);
      resultLines.push(`- \`${folderName}/characters/\``);
      for (const charName of validCharNames) {
        resultLines.push(`  - \`${folderName}/characters/${toSharedNotesFilename(charName)}\``);
      }

      return {
        content: [{ type: "text", text: resultLines.join("\n") }],
      };
    }

    case "add_character": {
      const groupName = (args as any)?.group_name as string | undefined;
      const charName = (args as any)?.character_name as string | undefined;

      let rootDir: string;
      try {
        rootDir = resolveRoot((args as any)?.working_directory as string | undefined);
      } catch (err: any) {
        return { content: [{ type: "text", text: `**Error:** ${err.message}` }] };
      }

      log("INFO", "Adding character", groupName ? `"${charName}" to "${groupName}" at ${rootDir}` : "validation in progress");

      // Validate
      const groupError = validateGroupName(groupName ?? "");
      if (groupError) {
        return {
          content: [{ type: "text", text: `**Error:** ${groupError}\n\nUsage: Provide \`group_name\` and \`character_name\`.` }],
        };
      }

      const charError = validateCharacterName(charName ?? "");
      if (charError) {
        return {
          content: [{ type: "text", text: `**Error:** ${charError}\n\nUsage: Provide \`group_name\` and \`character_name\`.` }],
        };
      }

      const folderName = toKebabCase(groupName!);
      const groupPath = path.join(rootDir, folderName);

      if (!fs.existsSync(groupPath)) {
        return {
          content: [{ type: "text", text: `**Error:** Group chat "${toDisplayName(folderName)}" not found in \`${rootDir}\`. Use \`list_group_chats\` to see available chats.` }],
        };
      }

      const filename = toSharedNotesFilename(charName!);
      const filePath = path.join(groupPath, "characters", filename);

      if (fs.existsSync(filePath)) {
        return {
          content: [{ type: "text", text: `**Error:** Character "${toPascalSnakeCase(charName!)}" already exists in this group chat.` }],
        };
      }

      // Ensure characters dir exists
      const charsDir = path.join(groupPath, "characters");
      if (!fs.existsSync(charsDir)) {
        fs.mkdirSync(charsDir, { recursive: true });
      }

      fs.writeFileSync(filePath, generateSharedNotesContent(charName!));

      return {
        content: [{ type: "text", text: `## ✓ Character Added\n\nAdded **${toPascalSnakeCase(charName!)}** to group chat **"${toDisplayName(folderName)}"** at \`${rootDir}\`.\n\nFile: \`${folderName}/characters/${filename}\`` }],
      };
    }

    case "validate_group_chat": {
      const groupName = (args as any)?.group_name as string | undefined;

      let rootDir: string;
      try {
        rootDir = resolveRoot((args as any)?.working_directory as string | undefined);
      } catch (err: any) {
        return { content: [{ type: "text", text: `**Error:** ${err.message}` }] };
      }

      log("INFO", "Validating group chat", groupName ? `"${groupName}" at ${rootDir}` : `all groups at ${rootDir}`);
      let targets: string[];

      if (groupName) {
        const folderName = toKebabCase(groupName);
        if (!fs.existsSync(path.join(rootDir, folderName))) {
          return {
            content: [{ type: "text", text: `**Error:** Group chat "${toDisplayName(folderName)}" not found in \`${rootDir}\`.` }],
          };
        }
        targets = [folderName];
      } else {
        targets = listGroupChatFolders(rootDir);
      }

      if (targets.length === 0) {
        return {
          content: [{ type: "text", text: "No group chats found to validate in the specified directory." }],
        };
      }

      const resultLines: string[] = [];
      let totalErrors = 0;

      for (const target of targets) {
        resultLines.push(`## Validating "${target}"`);
        resultLines.push(`Location: \`${rootDir}\``);
        resultLines.push("");
        const groupPath = path.join(rootDir, target);
        let folderErrors = 0;

        // Validate settings.md
        const settingsPath = path.join(groupPath, "settings.md");
        const settingsErrors = validateSettings(settingsPath);
        if (settingsErrors.length === 0) {
          resultLines.push(`- ✅ \`settings.md\` — All section limits OK`);
        } else {
          for (const err of settingsErrors) {
            resultLines.push(`- ❌ ${err.section}: ${err.message}`);
            folderErrors++;
          }
        }

        // Validate mind-map.md
        const mindMapPath = path.join(groupPath, "mind-map.md");
        if (fs.existsSync(mindMapPath)) {
          const content = fs.readFileSync(mindMapPath, "utf-8");
          const entryCount = (content.match(/^# Mind Map:/gm) || []).length;
          resultLines.push(`- ✅ \`mind-map.md\` — ${entryCount} entr${entryCount !== 1 ? "ies" : "y"}`);
        } else {
          resultLines.push(`- ⚠️ \`mind-map.md\` — File not found`);
          folderErrors++;
        }

        // Validate characters
        const charsDir = path.join(groupPath, "characters");
        if (fs.existsSync(charsDir)) {
          const charFiles = fs.readdirSync(charsDir).filter((f) => f.endsWith("_Shared_Notes.md"));
          if (charFiles.length === 0) {
            resultLines.push(`- ⚠️ \`characters/\` — No character files found`);
          } else {
            for (const charFile of charFiles) {
              const charErrors = validateSharedNotes(path.join(charsDir, charFile), charFile);
              if (charErrors.length === 0) {
                resultLines.push(`- ✅ \`${charFile}\` — All sections within limits`);
              } else {
                for (const err of charErrors) {
                  resultLines.push(`- ❌ ${err.section}: ${err.message}`);
                  folderErrors++;
                }
              }
            }
          }
        } else {
          resultLines.push(`- ⚠️ \`characters/\` — Folder not found`);
        }

        totalErrors += folderErrors;

        if (folderErrors === 0) {
          resultLines.push("");
          resultLines.push("✅ No issues found.");
        } else {
          resultLines.push("");
          resultLines.push(`⚠️ ${folderErrors} issue(s) found.`);
        }
        resultLines.push("");
      }

      if (totalErrors > 0) {
        resultLines.push(`---`);
        resultLines.push(`**${totalErrors} total issue(s) across ${targets.length} group chat(s). Fix before importing to Nomi.AI.**`);
      }

      return {
        content: [{ type: "text", text: resultLines.join("\n") }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ─── Resource Handlers ─────────────────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "nomi-gc://rules/overview",
      mimeType: "text/markdown",
      name: "Nomi-GC Overview & Character Limits",
      description: "What group chats are, file anatomy, and the character limits table",
    },
    {
      uri: "nomi-gc://rules/formatting",
      mimeType: "text/markdown",
      name: "Formatting Rules for Nomi.AI Group Chats",
      description: "Third-person rule, proper nouns, mind-map categories, section order",
    },
    {
      uri: "nomi-gc://rules/character-limits",
      mimeType: "application/json",
      name: "Character Limits as JSON",
      description: "The exact 10-section character limit table as structured JSON",
    },
    {
      uri: "nomi-gc://guides/ai-prompting",
      mimeType: "text/markdown",
      name: "AI Prompting Guide for Nomi-GC",
      description: "How an AI should use these tools creatively",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  let text: string;

  switch (request.params.uri) {
    case "nomi-gc://rules/overview":
      text = OVERVIEW_CONTENT;
      break;
    case "nomi-gc://rules/formatting":
      text = FORMATTING_CONTENT;
      break;
    case "nomi-gc://rules/character-limits":
      text = CHARACTER_LIMITS_CONTENT;
      break;
    case "nomi-gc://guides/ai-prompting":
      text = AI_GUIDING_CONTENT;
      break;
    default:
      throw new Error(`Unknown resource: ${request.params.uri}`);
  }

  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: request.params.uri.endsWith("character-limits") ? "application/json" : "text/markdown",
        text,
      },
    ],
  };
});

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});