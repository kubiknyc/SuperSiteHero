# MCP (Model Context Protocol) Setup Guide

## Overview

This guide helps you configure the Supabase MCP server for Claude Code integration with your construction management platform.

## Prerequisites

1. **Supabase Project**: You need an active Supabase project
2. **Personal Access Token**: Generate from Supabase dashboard
3. **Project Reference**: Your project's unique identifier

## Step 1: Get Your Supabase Credentials

### A. Get Project Reference

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **General**
4. Copy the **Reference ID** (looks like: `abcdefghijklmnop`)

### B. Generate Personal Access Token

1. Go to https://supabase.com/dashboard/account/tokens
2. Click **Generate new token**
3. Name it: `Claude Code MCP`
4. Set expiration (recommend: Never or 1 year)
5. Click **Generate token**
6. **IMPORTANT**: Copy the token immediately (you won't see it again!)

## Step 2: Configure .mcp.json

Edit the `.mcp.json` file in your project root:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=YOUR_PROJECT_REF_HERE"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_PERSONAL_ACCESS_TOKEN_HERE"
      }
    }
  }
}
```

Replace:
- `YOUR_PROJECT_REF_HERE` with your Project Reference ID
- `YOUR_PERSONAL_ACCESS_TOKEN_HERE` with your Personal Access Token

### Example (DO NOT USE THESE VALUES):

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=abcdefghijklmnop"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_1234567890abcdefghijklmnopqrstuvwxyz"
      }
    }
  }
}
```

## Step 3: Security Best Practices

### IMPORTANT: Never Commit Credentials

1. The `.mcp.json` file should be in `.gitignore` (already configured)
2. Never share your Personal Access Token
3. If token is exposed, revoke it immediately in Supabase dashboard

### Read-Only Mode

The `--read-only` flag ensures Claude Code can only:
- Read your database schema
- Query table structures
- View RLS policies
- Inspect indexes and constraints

It CANNOT:
- Modify data
- Delete records
- Alter schema
- Drop tables

To allow write operations (use with caution):
```json
"args": [
  "-y",
  "@supabase/mcp-server-supabase@latest",
  "--project-ref=YOUR_PROJECT_REF_HERE"
]
```

## Step 4: Test the Configuration

After configuring, restart Claude Code and try:

```
/supabase-schema-sync --pull
```

If configured correctly, you should see your database schema information.

## Troubleshooting

### Error: "Cannot find project"
- Verify your Project Reference ID is correct
- Check that the project exists in your Supabase account

### Error: "Authentication failed"
- Verify your Personal Access Token is correct
- Check token hasn't expired
- Ensure token has proper permissions

### Error: "Command not found"
- Ensure Node.js is installed
- Verify npx is available in your PATH
- Try running: `npx @supabase/mcp-server-supabase@latest --help`

## What MCP Enables

With MCP configured, Claude Code can:

1. **Schema Introspection**: Understand your database structure
2. **Type Generation**: Auto-generate TypeScript types from schema
3. **Migration Assistance**: Help create and validate migrations
4. **RLS Analysis**: Review and optimize Row-Level Security policies
5. **Performance Optimization**: Suggest indexes and query improvements

## Available Slash Commands (Requires MCP)

- `/supabase-schema-sync` - Sync database schema
- `/supabase-type-generator` - Generate TypeScript types
- `/supabase-migration-assistant` - Create migrations
- `/supabase-security-audit` - Audit RLS policies
- `/supabase-performance-optimizer` - Optimize database performance
- `/supabase-data-explorer` - Explore and query data
- `/supabase-backup-manager` - Manage backups
- `/supabase-realtime-monitor` - Monitor realtime connections

## Next Steps

After MCP is configured:

1. Run `/supabase-type-generator --all-tables` to generate types
2. Run `/supabase-security-audit --comprehensive` to audit security
3. Run `/supabase-performance-optimizer --queries` for performance tips

## Support

- Supabase MCP Server: https://github.com/supabase/mcp-server-supabase
- Claude Code Docs: https://docs.anthropic.com/claude-code
- Issues: Report in your project's GitHub issues
