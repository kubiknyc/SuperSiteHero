# MCP Quick Setup - Immediate Action Required

## ✅ What's Been Configured

1. **Environment variable added** to [.env](.env:10)
2. **MCP configuration updated** in [.mcp.json](.mcp.json:30)
3. **5 new MCP servers ready** (Playwright, Memory, Fetch, Time, GitHub)
4. **PostgreSQL MCP** needs database password

## 🔧 Final Step: Add Database Password

### Quick Method (2 minutes)

1. **Get your database password:**
   - Open [Supabase Dashboard](https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/settings/database)
   - Go to **Settings** → **Database**
   - Scroll to **Connection Pooling** section
   - Copy the connection string (it will look like):
     ```
     postgresql://postgres.nxlznnrocrffnbzjaaae:YOUR_PASSWORD_HERE@aws-0-us-east-1.pooler.supabase.com:6543/postgres
     ```

2. **Update your .env file:**
   - Open [.env](.env:10)
   - Find line 10: `POSTGRES_CONNECTION_STRING=...`
   - Replace `[YOUR-DB-PASSWORD]` with your actual database password

   Example:
   ```bash
   # Before:
   POSTGRES_CONNECTION_STRING=postgresql://postgres.nxlznnrocrffnbzjaaae:[YOUR-DB-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

   # After (with your actual password):
   POSTGRES_CONNECTION_STRING=postgresql://postgres.nxlznnrocrffnbzjaaae:abc123xyz@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

3. **Restart Claude Code:**
   - Close and reopen Claude Code
   - MCP servers will load automatically

## 🎯 Test Your Setup

After restarting, test each MCP server:

### Test Commands

**Supabase MCP** (already working):
```
Show me the projects table schema using Supabase MCP
```

**PostgreSQL MCP** (after adding password):
```
Query the database to count users in each role
```

**Playwright MCP**:
```
Use Playwright to launch a browser and navigate to localhost:5173
```

**Memory MCP**:
```
Remember: Our app uses RLS policies for multi-tenant security
```

**Fetch MCP**:
```
Fetch the latest React version from npm registry
```

**Time MCP**:
```
What time is it in New York, London, and Tokyo?
```

**GitHub MCP** (already working):
```
Show recent commits in the SuperSiteHero repository
```

## ⚠️ Security Notes

- **NEVER commit your database password** to version control
- The `.env` file is already in `.gitignore` (safe)
- Use **Connection Pooling** (port 6543) not direct connection (port 5432)
- PostgreSQL MCP will have the same permissions as your database user

## 🚀 What You Get

Once configured, you'll be able to:

✅ Query database directly through Claude Code
✅ Test your app with browser automation
✅ Store persistent context across sessions
✅ Make HTTP requests for API testing
✅ Handle time zones for construction scheduling
✅ Access GitHub issues and PRs

## 📚 Full Documentation

For detailed information, see [MCP_SETUP_GUIDE.md](MCP_SETUP_GUIDE.md)

## ❓ Troubleshooting

**Can't find database password?**
- It's in your Supabase Dashboard under Settings → Database
- Look for "Connection Pooling" section
- Click "Reset Database Password" if needed

**MCP servers not loading?**
- Ensure you've restarted Claude Code
- Check `.mcp.json` has valid JSON syntax
- Verify `npx` command is available: `npx --version`

**Connection errors?**
- Verify the connection string format is correct
- Ensure you're using port 6543 (Connection Pooling), not 5432
- Check your password doesn't contain special characters that need escaping

## ✅ Completion Checklist

- [x] MCP servers added to `.mcp.json`
- [x] Environment variable template added to `.env`
- [ ] **Database password added to `.env`** ← YOU ARE HERE
- [ ] Claude Code restarted
- [ ] MCP servers tested

---

**Next Step**: Add your database password to [.env](.env:10) and restart Claude Code!
