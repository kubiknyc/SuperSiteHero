# Google Drive MCP Server Setup Guide

## Installation Complete ✅

The Google Drive MCP server has been added to your `.mcp.json` configuration file.

## Next Steps: Get Google Drive API Credentials

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `SuperSiteHero-MCP` (or your preference)
4. Click "Create"

### Step 2: Enable Google Drive API

1. In the Google Cloud Console, navigate to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click on it and press **Enable**

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External** (or Internal if using Google Workspace)
   - App name: `SuperSiteHero MCP`
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue**
   - Scopes: Click **Add or Remove Scopes**, add:
     - `.../auth/drive.readonly` (Read-only access)
     - `.../auth/drive.file` (Per-file access)
     - `.../auth/drive` (Full access) - if needed
   - Click **Save and Continue**
   - Test users: Add your email
   - Click **Save and Continue**

4. Back in Credentials, click **Create Credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Name: `MCP Server`
7. Authorized redirect URIs: Add `http://localhost:3000/oauth/callback`
8. Click **Create**
9. **Copy the Client ID and Client Secret** (you'll need these next)

### Step 4: Configure Environment Variables

1. Create or edit your `.env` file in the project root:

```bash
# Copy from .env.example if you don't have .env yet
cp .env.example .env
```

2. Add your Google Drive credentials to `.env`:

```env
GDRIVE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GDRIVE_CLIENT_SECRET=your-actual-client-secret
```

### Step 5: Test the Installation

After adding the credentials to your `.env` file:

1. **Restart Claude Code** to load the new MCP server
2. The Google Drive MCP server will automatically start when Claude Code launches
3. On first use, you'll be prompted to authorize the app in your browser

## Available Features

Once configured, you'll be able to:

- 📁 **List files and folders** in Google Drive
- 📄 **Read file contents** (text, documents, spreadsheets)
- 🔍 **Search for files** by name or type
- 📤 **Upload files** to Google Drive
- 📥 **Download files** from Google Drive
- 🗂️ **Create folders** and organize files
- 🔗 **Get shareable links** to files

## Use Cases for Construction Management

### Document Management
- Store and retrieve construction drawings
- Access project specifications and contracts
- Manage submittal documents
- Archive daily reports and photos

### Team Collaboration
- Share RFI responses with team members
- Distribute meeting minutes and schedules
- Manage change order documentation
- Store safety incident reports

### Integration Ideas
- Automatically backup daily reports to Google Drive
- Sync document uploads from your app to Drive
- Import drawings from Drive into your document management
- Export project reports to Drive for client access

## Troubleshooting

### "Access blocked: Authorization Error"
- Make sure your app is published (or add yourself as a test user)
- Verify the redirect URI matches exactly: `http://localhost:3000/oauth/callback`

### "Invalid client" Error
- Double-check your Client ID and Client Secret in `.env`
- Ensure there are no extra spaces or quotes

### MCP Server Not Starting
- Verify `.mcp.json` syntax is valid (use a JSON validator)
- Check that environment variables are loaded (restart Claude Code)
- Look for errors in Claude Code's MCP server logs

## Security Notes

⚠️ **Important Security Practices:**

1. **Never commit `.env` to git** - it contains sensitive credentials
2. The `.gitignore` file should include `.env` (already configured)
3. Keep your Client Secret private
4. Use read-only scopes unless you need write access
5. Regularly review OAuth app permissions in Google Account settings

## Configuration Files Modified

- ✅ `.mcp.json` - Added google-drive server configuration
- ✅ `.env.example` - Added credential placeholders and setup instructions

## Next MCP Servers to Consider

Based on your construction platform, you might also want:
- **Google Calendar MCP** - Schedule inspections and milestones
- **Dropbox MCP** - Alternative document storage
- **AWS S3 MCP** - Large file storage and backups

---

**Need Help?**
- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [MCP Server Documentation](https://github.com/modelcontextprotocol/servers)
