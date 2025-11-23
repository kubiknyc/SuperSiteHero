# GitHub MCP Server Setup

## Overview

This project now has **persistent MCP access** to the GitHub repository `kubiknyc/SuperSiteHero` through the MCP (Model Context Protocol) remote server.

## What Was Configured

### MCP Servers

The `.mcp.json` file now includes two MCP servers:

1. **Supabase MCP Server** - Database access
2. **GitHub MCP Server** - Repository access via https://gitmcp.io

### Configuration Details

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=nxlznnrocrffnbzjaaae"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_***"
      }
    },
    "github-supersitehero": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://gitmcp.io/kubiknyc/SuperSiteHero"
      ]
    }
  }
}
```

## What This Enables

With the GitHub MCP server, Claude Code can now:

### Repository Access
- ✅ Read repository files
- ✅ Browse directory structure
- ✅ Access commit history
- ✅ View branches and tags
- ✅ Read README, documentation, and issues
- ✅ Search across repository content

### Integration Benefits
- **Contextual Awareness**: Claude Code can reference the actual GitHub repository
- **Synchronization**: Can compare local changes with remote repository
- **Documentation**: Access to all repository documentation and wikis
- **Issue Tracking**: Can reference GitHub issues and pull requests
- **Version History**: Can analyze commit history and changes

## How to Use

The MCP server runs automatically when Claude Code starts. You don't need to run any commands manually.

### Restart Claude Code

To activate the new GitHub MCP server:

1. **Close Claude Code** completely
2. **Reopen Claude Code** in this project directory
3. The MCP servers will start automatically in the background

### Verify Connection

After restarting, the MCP servers should be available. You can verify by:

1. Checking the Claude Code status bar (should show MCP servers connected)
2. Using MCP-enabled features (repository queries, schema introspection, etc.)

## Available MCP Servers

| Server Name | Purpose | Status |
|------------|---------|---------|
| `supabase` | Database schema and query access | ✅ Configured |
| `github-supersitehero` | GitHub repository access | ✅ Configured |

## Troubleshooting

### MCP Server Not Starting

If the GitHub MCP server doesn't start:

1. **Check Node.js**: Ensure Node.js is installed
   ```bash
   node --version
   npx --version
   ```

2. **Test Manually**:
   ```bash
   npx mcp-remote@latest https://gitmcp.io/kubiknyc/SuperSiteHero
   ```

3. **Check Logs**: Look for MCP-related errors in Claude Code output panel

### Connection Issues

If connection fails:

- Verify the repository exists: https://github.com/kubiknyc/SuperSiteHero
- Check internet connectivity
- Ensure firewall isn't blocking the connection
- Try restarting Claude Code

### Reset Configuration

To reset the MCP configuration:

1. Restore from backup:
   ```bash
   cp .mcp.json.backup .mcp.json
   ```

2. Or manually edit `.mcp.json` and remove the `github-supersitehero` entry

## Security Notes

### What's Shared

The GitHub MCP server only has:
- ✅ Read access to public repository content
- ✅ No write permissions
- ✅ No access to private data
- ✅ No authentication tokens required for public repos

### What's NOT Shared

- ❌ Local files (unless explicitly in the repository)
- ❌ Environment variables
- ❌ Supabase access tokens
- ❌ Any credentials or secrets

## Advanced Configuration

### Custom Port

If you need to specify a custom callback port:

```json
{
  "github-supersitehero": {
    "command": "npx",
    "args": [
      "-y",
      "mcp-remote@latest",
      "--port=4353",
      "https://gitmcp.io/kubiknyc/SuperSiteHero"
    ]
  }
}
```

### Additional Options

See `npx mcp-remote@latest --help` for more configuration options.

## Next Steps

Now that GitHub MCP is configured:

1. ✅ **MCP servers start automatically** when Claude Code opens this project
2. ✅ **Repository context available** for all Claude Code operations
3. ✅ **Enhanced code awareness** across local and remote code

## Support

- **MCP Remote**: https://github.com/modelcontextprotocol/mcp-remote
- **GitMCP.io**: https://gitmcp.io
- **Claude Code Docs**: https://docs.anthropic.com/claude-code
- **Issues**: Report in GitHub repository

---

**Created**: November 23, 2025
**Status**: ✅ Active and Configured
