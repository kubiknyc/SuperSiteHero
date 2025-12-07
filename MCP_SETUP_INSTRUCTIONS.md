# MCP Servers Setup Instructions

This guide will help you configure all MCP (Model Context Protocol) servers for your construction field management platform.

## Quick Start

All MCP servers are configured in `.mcp.json`. Most require environment variables that should be added to your system environment or a `.env.mcp` file.

## Required Environment Variables

### 1. GitHub Integration
**Purpose**: Repository management, issue tracking, PR automation

```bash
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here
```

**How to get it:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `read:org`, `read:user`
4. Copy the token

**What it enables:**
- File operations in repositories
- Issue management
- Pull request automation
- Branch management

---

### 2. PostgreSQL Direct Access
**Purpose**: Direct database queries and management

```bash
POSTGRES_CONNECTION_STRING=postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**How to get it:**
1. Go to your Supabase project dashboard
2. Navigate to Project Settings > Database
3. Copy the connection string under "Connection string"
4. Use the "Connection pooling" version for better performance

**What it enables:**
- Direct SQL queries
- Database introspection
- Migration management
- Performance analysis

---

### 3. Brave Search API
**Purpose**: Web search capabilities for construction specs, materials, regulations

```bash
BRAVE_API_KEY=your_brave_api_key_here
```

**How to get it:**
1. Go to https://brave.com/search/api/
2. Sign up for a free account (2,000 queries/month free)
3. Generate an API key from the dashboard

**What it enables:**
- Search building codes and regulations
- Find material specifications
- Research construction best practices
- Look up safety guidelines

---

### 4. Google Maps API
**Purpose**: Site locations, directions, geofencing for construction sites

```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**How to get it:**
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable "Maps JavaScript API" and "Geocoding API"
4. Go to Credentials > Create Credentials > API Key

**What it enables:**
- Site location mapping
- Distance calculations
- Address geocoding
- Route planning for materials delivery

---

### 5. Slack Integration
**Purpose**: Team notifications, daily reports, safety alerts

```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_TEAM_ID=T0123456789
```

**How to get it:**
1. Go to https://api.slack.com/apps
2. Create a new app or select existing
3. Go to "OAuth & Permissions"
4. Add bot token scopes: `chat:write`, `channels:read`, `users:read`
5. Install app to workspace
6. Copy the "Bot User OAuth Token"
7. Find Team ID in workspace settings

**What it enables:**
- Automated daily report notifications
- Safety incident alerts
- RFI notifications
- Change order approvals

---

### 6. Sentry Error Tracking
**Purpose**: Production error monitoring and debugging

```bash
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

**How to get it:**
1. Go to https://sentry.io/
2. Sign up or log in
3. Go to Settings > Account > API > Auth Tokens
4. Create new token with `project:read` and `org:read` scopes

**What it enables:**
- Production error monitoring
- Performance tracking
- Release tracking
- User feedback collection

---

## MCP Servers Configuration Status

### ✅ Already Configured (No Action Needed)
- **Supabase** - Connected to your database
- **Sequential Thinking** - Advanced reasoning
- **Memory** - Persistent conversation memory
- **Fetch** - Web content fetching
- **Time** - Date/time utilities
- **Everything** - Windows file search
- **Filesystem** - File operations (configured for your project directory)
- **Playwright** - Browser automation for E2E tests
- **Puppeteer** - Alternative browser automation

### ⚙️ Needs Configuration (Add Environment Variables)
- **GitHub** - Requires `GITHUB_PERSONAL_ACCESS_TOKEN`
- **PostgreSQL** - Requires `POSTGRES_CONNECTION_STRING`
- **Brave Search** - Requires `BRAVE_API_KEY`
- **Google Maps** - Requires `GOOGLE_MAPS_API_KEY`
- **Slack** - Requires `SLACK_BOT_TOKEN` and `SLACK_TEAM_ID`
- **Sentry** - Requires `SENTRY_AUTH_TOKEN`

## Setting Environment Variables (Windows)

### Option 1: System Environment Variables (Recommended)
1. Press `Win + X` and select "System"
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "User variables", click "New"
5. Add each variable name and value
6. Restart your terminal/IDE

### Option 2: PowerShell Profile (Session-based)
Add to your PowerShell profile (`$PROFILE`):
```powershell
$env:GITHUB_PERSONAL_ACCESS_TOKEN = "ghp_your_token"
$env:POSTGRES_CONNECTION_STRING = "postgresql://..."
$env:BRAVE_API_KEY = "your_brave_key"
$env:GOOGLE_MAPS_API_KEY = "your_google_maps_key"
$env:SLACK_BOT_TOKEN = "xoxb-your-token"
$env:SLACK_TEAM_ID = "T0123456789"
$env:SENTRY_AUTH_TOKEN = "your_sentry_token"
```

### Option 3: .env File (For Claude Code)
Create `.env.local` in your project root:
```bash
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token
POSTGRES_CONNECTION_STRING=postgresql://...
BRAVE_API_KEY=your_brave_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_TEAM_ID=T0123456789
SENTRY_AUTH_TOKEN=your_sentry_token
```

**Important:** Add `.env.local` to your `.gitignore` file!

## Testing Your Configuration

After setting up environment variables, restart Claude Code and test:

1. **GitHub**: Try listing repositories or creating an issue
2. **PostgreSQL**: Run a simple query to fetch projects
3. **Brave Search**: Search for "construction safety regulations"
4. **Google Maps**: Geocode a construction site address
5. **Slack**: Send a test message to a channel
6. **Sentry**: Check if error tracking is working

## Priority Configuration for Construction Platform

### High Priority (Set these first):
1. ✅ **Supabase** - Already configured
2. ⚙️ **GitHub** - For version control and CI/CD
3. ⚙️ **PostgreSQL** - For advanced database operations
4. ⚙️ **Google Maps** - For site location features

### Medium Priority:
5. ⚙️ **Slack** - For team notifications
6. ⚙️ **Sentry** - For production monitoring
7. ⚙️ **Brave Search** - For research capabilities

### Low Priority:
- Other MCP servers can be configured as needed

## Troubleshooting

### "MCP server not responding"
- Check that environment variables are set correctly
- Restart your terminal/IDE after setting environment variables
- Verify API keys are valid and not expired

### "Permission denied"
- For filesystem MCP, ensure the path exists and is accessible
- For API-based MCPs, check API key permissions/scopes

### "Connection timeout"
- Check your internet connection
- Verify API endpoints are accessible
- Some services may be blocked by corporate firewalls

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate keys regularly** (every 90 days recommended)
4. **Use least privilege** - only grant necessary scopes
5. **Monitor usage** - set up alerts for unusual API activity

## Need Help?

- Supabase: https://supabase.com/docs
- GitHub API: https://docs.github.com/en/rest
- Google Maps: https://developers.google.com/maps
- Brave Search: https://brave.com/search/api/docs
- Slack API: https://api.slack.com/docs
- Sentry: https://docs.sentry.io/

## Next Steps

After configuring your MCP servers:
1. Test each integration individually
2. Update your `.gitignore` to exclude `.env.local`
3. Document any custom configurations for your team
4. Set up monitoring and alerts
5. Train team members on using MCP-powered features
