# MCP Servers Complete Guide

## Overview

Your project now has **15 MCP servers** configured, providing powerful integrations for database access, browser automation, search, file operations, and more.

## Installed MCP Servers

### Core Servers (Working Immediately)

#### 1. ✅ Supabase MCP
**Status**: Active (read-only mode)
**Purpose**: Database queries, schema inspection, table access

**Capabilities**:
- Query any table in your database
- Inspect schema and relationships
- View RLS policies
- Check indexes and constraints

**Example uses**:
```
"Show me all projects in the database"
"What tables exist in the public schema?"
"Query daily reports for project X"
```

**Configuration**:
```json
{
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase@latest", "--read-only"]
}
```

---

#### 2. ✅ GitHub MCP
**Status**: Active
**Purpose**: Repository access, issues, PRs, commits

**Capabilities**:
- Browse repository files
- View and create issues
- Check pull requests
- View commit history
- Search code

**Example uses**:
```
"Show recent commits in the repo"
"List all open issues"
"Search for 'RLS policy' in the codebase"
```

**Configuration**:
```json
{
  "command": "npx",
  "args": ["-y", "mcp-remote@latest", "https://gitmcp.io/kubiknyc/SuperSiteHero"]
}
```

---

#### 3. ✅ PostgreSQL MCP
**Status**: Active (password configured)
**Purpose**: Direct PostgreSQL queries with advanced features

**Capabilities**:
- Execute SQL queries
- Create/modify tables
- Analyze query performance
- View execution plans
- Database administration

**Example uses**:
```
"Run EXPLAIN ANALYZE on the daily reports query"
"Show me the table sizes in the database"
"Find all tables without indexes"
```

**Configuration**:
```json
{
  "env": {
    "POSTGRES_CONNECTION_STRING": "postgresql://..."
  }
}
```

---

#### 4. ✅ Playwright MCP
**Status**: Ready
**Purpose**: Browser automation for testing and scraping

**Capabilities**:
- Launch browsers (Chrome, Firefox, Safari)
- Navigate pages
- Click elements
- Fill forms
- Take screenshots
- Run E2E test scenarios

**Example uses**:
```
"Launch a browser and test the login flow"
"Take a screenshot of the dashboard page"
"Automate filling out the daily report form"
```

**Configuration**:
```json
{
  "command": "npx",
  "args": ["-y", "@executeautomation/playwright-mcp-server@latest"]
}
```

---

#### 5. ✅ Memory MCP
**Status**: Ready
**Purpose**: Persistent memory across sessions

**Capabilities**:
- Store information between sessions
- Remember decisions and patterns
- Build project knowledge base
- Maintain context over time

**Example uses**:
```
"Remember: Our RLS policies use company_id for isolation"
"What did we discuss about the offline sync strategy?"
"Store this: We use React Query with 5-minute stale time"
```

**Configuration**:
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory@latest"]
}
```

---

#### 6. ✅ Fetch MCP
**Status**: Ready
**Purpose**: HTTP requests and API testing

**Capabilities**:
- Make GET/POST/PUT/DELETE requests
- Test API endpoints
- Fetch external data
- Debug API responses
- Test webhooks

**Example uses**:
```
"Test the Supabase REST API endpoint"
"Fetch weather data for New York"
"Make a POST request to create a project"
```

**Configuration**:
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-fetch@latest"]
}
```

---

#### 7. ✅ Time MCP
**Status**: Ready
**Purpose**: Time zones and date calculations

**Capabilities**:
- Convert time zones
- Calculate date differences
- Format timestamps
- Get current time in any timezone
- Schedule calculations

**Example uses**:
```
"What time is it in Tokyo and Los Angeles?"
"Convert this timestamp to EST"
"Calculate days between two dates"
```

**Configuration**:
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-time@latest"]
}
```

---

#### 8. ✅ Filesystem MCP
**Status**: Ready
**Purpose**: Advanced file operations

**Capabilities**:
- Read/write files
- Directory operations
- File search
- Batch operations
- File metadata

**Example uses**:
```
"List all TypeScript files in src/features"
"Search for files containing 'useQuery'"
"Read all files in the hooks directory"
```

**Configuration**:
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem@latest", "c:\\Users\\Eli\\Documents\\git"]
}
```

---

#### 9. ✅ Puppeteer MCP
**Status**: Ready
**Purpose**: Advanced browser automation and web scraping

**Capabilities**:
- Headless browser control
- DOM manipulation
- JavaScript execution
- Network interception
- PDF generation from web pages

**Example uses**:
```
"Generate a PDF of the daily report page"
"Scrape construction permit data from a website"
"Test the app in headless mode"
```

**Configuration**:
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-puppeteer@latest"]
}
```

---

#### 10. ✅ Sequential Thinking MCP
**Status**: Ready
**Purpose**: Multi-step problem solving with chain-of-thought

**Capabilities**:
- Break down complex problems
- Step-by-step reasoning
- Hypothesis generation
- Verification loops
- Iterative refinement

**Example uses**:
```
"Analyze the performance bottleneck step by step"
"Debug this complex issue using sequential thinking"
"Plan the RFI feature implementation with detailed steps"
```

**Configuration**:
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sequential-thinking@latest"]
}
```

---

#### 11. ✅ Everything MCP
**Status**: Ready
**Purpose**: Windows file search using Everything search engine

**Capabilities**:
- Lightning-fast file search on Windows
- Search by name, extension, path
- Instant results across entire drive
- Powerful query syntax

**Example uses**:
```
"Find all .env files on my computer"
"Search for migration files in the project"
"Locate all TypeScript configuration files"
```

**Configuration**:
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-everything@latest"]
}
```

---

### Optional Servers (Require API Keys)

#### 12. ⚠️ Brave Search MCP
**Status**: Requires API key
**Purpose**: Web search capabilities

**Setup**:
1. Get API key: https://brave.com/search/api/
2. Add to `.env`: `BRAVE_API_KEY=your_key`
3. Restart Claude Code

**Example uses**:
```
"Search the web for React Query best practices"
"Find recent articles about PWA offline strategies"
"Look up construction industry RFI standards"
```

---

#### 13. ⚠️ Google Maps MCP
**Status**: Requires API key
**Purpose**: Location services, geocoding, directions

**Setup**:
1. Get API key: https://console.cloud.google.com/
2. Add to `.env`: `GOOGLE_MAPS_API_KEY=your_key`
3. Restart Claude Code

**Example uses**:
```
"Get coordinates for this construction site address"
"Calculate distance between two project locations"
"Find nearby construction supply stores"
```

---

#### 14. ⚠️ Slack MCP
**Status**: Requires bot token
**Purpose**: Slack integration for notifications

**Setup**:
1. Create Slack app: https://api.slack.com/apps
2. Get bot token and team ID
3. Add to `.env`:
   ```
   SLACK_BOT_TOKEN=xoxb-your-token
   SLACK_TEAM_ID=your-team-id
   ```
4. Restart Claude Code

**Example uses**:
```
"Send a message to #dev-team channel"
"Post a notification about the build status"
"Check recent messages in #construction-updates"
```

---

#### 15. ⚠️ Sentry MCP
**Status**: Requires auth token
**Purpose**: Error tracking and monitoring

**Setup**:
1. Get auth token: https://sentry.io/settings/account/api/auth-tokens/
2. Add to `.env`: `SENTRY_AUTH_TOKEN=your_token`
3. Restart Claude Code

**Example uses**:
```
"Show recent errors in production"
"Analyze error patterns in Sentry"
"Create a new issue for this error"
```

---

## Quick Reference Table

| MCP Server | Status | Purpose | API Key Required |
|------------|--------|---------|------------------|
| Supabase | ✅ Active | Database queries | No |
| GitHub | ✅ Active | Repository access | No |
| PostgreSQL | ✅ Active | Direct SQL queries | No (uses connection string) |
| Playwright | ✅ Ready | Browser automation | No |
| Memory | ✅ Ready | Persistent context | No |
| Fetch | ✅ Ready | HTTP requests | No |
| Time | ✅ Ready | Time zones | No |
| Filesystem | ✅ Ready | File operations | No |
| Puppeteer | ✅ Ready | Web scraping | No |
| Sequential Thinking | ✅ Ready | Problem solving | No |
| Everything | ✅ Ready | File search (Windows) | No |
| Brave Search | ⚠️ Optional | Web search | Yes |
| Google Maps | ⚠️ Optional | Location services | Yes |
| Slack | ⚠️ Optional | Team notifications | Yes |
| Sentry | ⚠️ Optional | Error tracking | Yes |

## Use Cases for Your Construction App

### Daily Development
1. **Database queries** (Supabase/PostgreSQL MCP)
   - Query project data
   - Test RLS policies
   - Analyze table structures

2. **Testing** (Playwright MCP)
   - E2E test automation
   - Screenshot comparisons
   - Form validation

3. **Code search** (GitHub MCP + Filesystem MCP)
   - Find similar patterns
   - Locate implementations
   - Review code history

4. **API testing** (Fetch MCP)
   - Test Supabase endpoints
   - Debug API responses
   - Validate webhooks

### Construction-Specific Features

1. **Location services** (Google Maps MCP)
   - Geocode project addresses
   - Calculate distances between sites
   - Find nearby resources

2. **Web research** (Brave Search MCP)
   - Construction standards
   - Building codes
   - Industry best practices

3. **Team communication** (Slack MCP)
   - Daily report notifications
   - RFI status updates
   - Safety alerts

4. **Error monitoring** (Sentry MCP)
   - Track production errors
   - Analyze error patterns
   - Debug field issues

### Debugging & Analysis

1. **Sequential thinking** (Sequential Thinking MCP)
   - Complex bug investigation
   - Architecture planning
   - Performance analysis

2. **Memory** (Memory MCP)
   - Remember architecture decisions
   - Track ongoing work
   - Build knowledge base

3. **Browser automation** (Puppeteer MCP)
   - Test offline functionality
   - Generate PDF reports
   - Scrape permit data

## Configuration Files

### .mcp.json
Location: `c:\Users\Eli\Documents\git\.mcp.json`

Contains all MCP server configurations. Edit this file to:
- Add new servers
- Modify existing servers
- Remove servers

### .env
Location: `c:\Users\Eli\Documents\git\.env`

Contains API keys and secrets. Add optional keys here:
```bash
# Optional MCP Server API Keys
BRAVE_API_KEY=your_key
GOOGLE_MAPS_API_KEY=your_key
SLACK_BOT_TOKEN=your_token
SLACK_TEAM_ID=your_team_id
SENTRY_AUTH_TOKEN=your_token
```

## Getting Started

### Immediate Use (No Setup Needed)

These servers work right now:
1. Supabase - Database queries
2. GitHub - Repository access
3. PostgreSQL - SQL queries
4. Playwright - Browser automation
5. Memory - Persistent context
6. Fetch - HTTP requests
7. Time - Time zones
8. Filesystem - File operations
9. Puppeteer - Web scraping
10. Sequential Thinking - Problem solving
11. Everything - File search

### Try These Commands

**Database**:
```
"Show me all projects in the database"
"Query users table for company data"
```

**Browser Automation**:
```
"Use Playwright to test the login page"
"Take a screenshot of the dashboard"
```

**API Testing**:
```
"Test the projects API endpoint"
"Fetch data from Supabase REST API"
```

**Problem Solving**:
```
"Use sequential thinking to debug this error"
"Break down the RFI implementation into steps"
```

**File Operations**:
```
"Search for all files containing 'useQuery'"
"List TypeScript files in src/features"
```

## Advanced Usage

### Combining MCP Servers

**Full Feature Implementation**:
1. Brave Search - Research best practices
2. Memory - Store architecture decisions
3. Supabase - Design database schema
4. GitHub - Review existing code
5. Fetch - Test API endpoints
6. Playwright - Create E2E tests

**Debugging Workflow**:
1. Sentry - Identify error patterns
2. Sequential Thinking - Analyze root cause
3. PostgreSQL - Query relevant data
4. Memory - Record findings
5. GitHub - Check related code

**Testing Pipeline**:
1. Playwright - Run browser tests
2. Fetch - Test API endpoints
3. PostgreSQL - Verify database state
4. Slack - Send test results

## Troubleshooting

### MCP Server Not Loading
1. Check `.mcp.json` syntax (valid JSON)
2. Verify `npx` is available: `npx --version`
3. Restart Claude Code
4. Check error messages in Claude Code logs

### API Key Issues
1. Verify key is in `.env` file
2. Check key format (no quotes needed)
3. Ensure no trailing spaces
4. Restart Claude Code after adding keys

### Connection Errors
1. **PostgreSQL**: Verify connection string format
2. **Supabase**: Check access token is valid
3. **GitHub**: Ensure repository is accessible
4. Check network connectivity

### Performance Issues
- Some servers download packages on first use (30s-1min)
- Use `--read-only` for database servers when possible
- Limit concurrent MCP operations
- Clear npm cache if issues persist: `npm cache clean --force`

## Best Practices

### Security
1. Never commit API keys to version control
2. Use environment variables for secrets
3. Use read-only mode for production databases
4. Regularly rotate API keys

### Performance
1. Use specific MCP servers for tasks (don't use Everything for database queries)
2. Cache frequently accessed data in Memory MCP
3. Limit database query results with LIMIT
4. Use Playwright headless mode for speed

### Organization
1. Document MCP usage patterns in Memory MCP
2. Create shortcuts for common tasks
3. Combine servers for complex workflows
4. Keep `.env` file organized with comments

## Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [Supabase MCP](https://github.com/supabase/mcp-server-supabase)
- [Official MCP Servers](https://github.com/modelcontextprotocol/servers)
- [Playwright MCP](https://github.com/executeautomation/playwright-mcp-server)

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Verify `.mcp.json` and `.env` configuration
3. Test individual servers manually with npx
4. Check Claude Code logs for error messages
5. Review MCP server documentation

---

**Last Updated**: 2025-12-04
**Total MCP Servers**: 15 (11 ready immediately + 4 optional)
**Status**: ✅ Fully Configured
