# MCP Server Setup Guide

## Overview

Your project now has **7 MCP servers** configured to enhance Claude Code's capabilities.

## Configured MCP Servers

### 1. ✅ Supabase MCP (Already Working)
**Status**: Active
**Purpose**: Query database, inspect schema, read tables
**Mode**: Read-only (safe)

```json
"supabase": {
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase@latest", "--read-only", "--project-ref=nxlznnrocrffnbzjaaae"],
  "env": {
    "SUPABASE_ACCESS_TOKEN": "sbp_..."
  }
}
```

### 2. ✅ GitHub MCP (Already Working)
**Status**: Active
**Purpose**: Access GitHub issues, PRs, repository files
**Repository**: kubiknyc/SuperSiteHero

```json
"github-supersitehero": {
  "command": "npx",
  "args": ["-y", "mcp-remote@latest", "https://gitmcp.io/kubiknyc/SuperSiteHero"]
}
```

### 3. ⚠️ PostgreSQL MCP (Needs Configuration)
**Status**: Requires connection string
**Purpose**: Direct PostgreSQL queries with advanced features
**Setup Required**: Yes

**How to configure**:
1. Get your Supabase connection string:
   - Go to Supabase Dashboard > Project Settings > Database
   - Copy the **Connection Pooling** string (port 6543)
2. Update `.mcp.json` line 30:
   ```
   "POSTGRES_CONNECTION_STRING": "postgresql://postgres.nxlznnrocrffnbzjaaae:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
   ```

**Alternative**: Use environment variable:
```bash
# In .env.local (don't commit!)
POSTGRES_CONNECTION_STRING=postgresql://postgres.nxlznnrocrffnbzjaaae:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Then update `.mcp.json`:
```json
"env": {
  "POSTGRES_CONNECTION_STRING": "${POSTGRES_CONNECTION_STRING}"
}
```

### 4. ✅ Playwright MCP (Ready to Use)
**Status**: Ready (you already have Playwright installed)
**Purpose**: Browser automation for E2E testing
**Features**:
- Launch browsers programmatically
- Navigate pages
- Take screenshots
- Run test scenarios

**Useful for**:
- Debugging E2E tests
- Creating test fixtures
- Validating UI behavior

### 5. ✅ Memory MCP (Ready to Use)
**Status**: Ready
**Purpose**: Persistent memory across sessions
**Features**:
- Store project context
- Remember decisions and patterns
- Track feature implementation status

**Useful for**:
- Tracking multi-session work
- Remembering architecture decisions
- Building project knowledge base

### 6. ✅ Fetch MCP (Ready to Use)
**Status**: Ready
**Purpose**: HTTP requests and API testing
**Features**:
- Make HTTP requests
- Test API endpoints
- Fetch external data

**Useful for**:
- Testing your API routes
- Debugging Supabase API calls
- Validating webhooks

### 7. ✅ Time MCP (Ready to Use)
**Status**: Ready
**Purpose**: Time zones and date calculations
**Features**:
- Convert time zones
- Calculate dates
- Format timestamps

**Useful for**:
- Construction scheduling
- Daily reports with correct times
- Multi-timezone project coordination

## Quick Setup Checklist

- [x] Supabase MCP configured
- [x] GitHub MCP configured
- [ ] PostgreSQL connection string (optional - see section 3)
- [x] Playwright MCP ready
- [x] Memory MCP ready
- [x] Fetch MCP ready
- [x] Time MCP ready

## Testing Your MCP Setup

After configuring PostgreSQL (if needed), restart Claude Code to load new MCP servers.

### Test Commands

**1. Test Supabase MCP**:
```
Ask Claude: "Use Supabase MCP to show me the projects table schema"
```

**2. Test GitHub MCP**:
```
Ask Claude: "Show me recent issues in the SuperSiteHero repository"
```

**3. Test PostgreSQL MCP** (after configuration):
```
Ask Claude: "Query the database to show all users"
```

**4. Test Playwright MCP**:
```
Ask Claude: "Use Playwright to launch a browser and navigate to localhost:5173"
```

**5. Test Memory MCP**:
```
Ask Claude: "Store in memory: Our RLS policies use company_id for multi-tenant isolation"
Then later: "What did we discuss about RLS policies?"
```

**6. Test Fetch MCP**:
```
Ask Claude: "Fetch the latest version of React from npm registry"
```

**7. Test Time MCP**:
```
Ask Claude: "What time is it in New York, Los Angeles, and Tokyo?"
```

## Benefits for Your Project

### Construction Field Management Use Cases

1. **Database Operations** (Supabase + PostgreSQL MCP)
   - Query production data safely
   - Inspect schema and relationships
   - Test RLS policies
   - Analyze data patterns

2. **E2E Testing** (Playwright MCP)
   - Debug failing tests
   - Create new test scenarios
   - Validate offline functionality
   - Test mobile responsiveness

3. **API Testing** (Fetch MCP)
   - Test Supabase endpoints
   - Validate authentication flows
   - Debug API responses

4. **Project Context** (Memory MCP)
   - Remember architecture decisions
   - Track feature implementation status
   - Build knowledge base over time

5. **Scheduling** (Time MCP)
   - Calculate project timelines
   - Handle timezone conversions
   - Format dates for daily reports

## Security Considerations

### Safe Practices

✅ **DO**:
- Keep `.mcp.json` in version control (it's configuration)
- Use read-only mode for production data
- Store passwords in environment variables
- Use connection pooling (port 6543) for PostgreSQL

❌ **DON'T**:
- Commit passwords directly in `.mcp.json`
- Use service role key in MCP (stick to regular credentials)
- Give write access to production database via MCP
- Store sensitive tokens in plain text

### Recommended `.env.local` Setup

```bash
# Supabase (already in .env)
VITE_SUPABASE_URL=https://nxlznnrocrffnbzjaaae.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# MCP Servers (add these)
SUPABASE_ACCESS_TOKEN=sbp_08284dc1410d2ae34b8795bb17126179f2da2d39
POSTGRES_CONNECTION_STRING=postgresql://postgres.nxlznnrocrffnbzjaaae:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Then update `.mcp.json` to reference environment variables:
```json
"env": {
  "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}",
  "POSTGRES_CONNECTION_STRING": "${POSTGRES_CONNECTION_STRING}"
}
```

## Troubleshooting

### MCP Server Not Loading

1. **Restart Claude Code**
   - MCP servers load on startup
   - Close and reopen Claude Code after `.mcp.json` changes

2. **Check npx is available**
   ```bash
   npx --version
   ```

3. **Test manual installation**
   ```bash
   npx -y @modelcontextprotocol/server-postgres@latest
   ```

### Connection Errors

**PostgreSQL MCP**: Check connection string format
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

**Supabase MCP**: Verify access token has correct permissions

### Performance Issues

- Some MCP servers download on first use (may take 30s-1min)
- Use `--read-only` flag for database servers to prevent accidental writes
- Limit concurrent MCP operations

## Next Steps

1. **Configure PostgreSQL connection** (optional but recommended)
2. **Restart Claude Code** to load new servers
3. **Test each MCP server** using commands above
4. **Start using MCP features** in your daily workflow

## Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [Supabase MCP Server](https://github.com/supabase/mcp-server-supabase)
- [Official MCP Servers](https://github.com/modelcontextprotocol/servers)
- [Claude Code MCP Guide](https://claude.ai/code/docs/mcp)

## Getting Help

If you encounter issues:
1. Check this guide's troubleshooting section
2. Verify `.mcp.json` syntax (use a JSON validator)
3. Check Claude Code logs for MCP server errors
4. Test individual MCP servers manually with npx

---

**Last Updated**: 2025-12-04
**Project**: SuperSiteHero Construction Field Management
**MCP Servers**: 7 configured (6 ready, 1 needs setup)
