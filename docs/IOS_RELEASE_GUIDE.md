# iOS Release Guide for JobSight

This guide covers building and releasing JobSight to the Apple App Store using GitHub Actions (no Mac required).

## Overview

JobSight uses **Capacitor** to wrap the React web app as a native iOS application, and **Fastlane** for automated builds and deployment.

```
React App → Vite Build → Capacitor Sync → Fastlane → TestFlight/App Store
```

## Prerequisites

### Apple Developer Account
1. Active Apple Developer Program membership ($99/year)
2. App ID registered: `com.jobsightapp.app`
3. App created in App Store Connect
4. App Store Connect API Key for CI/CD

### GitHub Setup
1. Private repository for certificates: `jobsight-certificates`
2. GitHub Secrets configured (see below)

## Quick Start (No Mac Required)

### 1. Configure Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. **Identifiers** → Register App ID: `com.jobsightapp.app`
3. Enable capabilities: Push Notifications, Associated Domains

### 2. Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. **My Apps** → **+** → **New App**
3. Bundle ID: `com.jobsightapp.app`

### 3. Generate API Key

1. **Users and Access** → **Integrations** → **App Store Connect API**
2. Generate key with "App Manager" role
3. Download `.p8` file immediately (one-time download!)
4. Note: Key ID and Issuer ID

### 4. Create Certificate Repository

Create a **private** GitHub repository: `jobsight-certificates`

### 5. Add GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions**

| Secret | Description | Where to Find |
|--------|-------------|---------------|
| `APP_STORE_CONNECT_API_KEY_ID` | API Key ID | App Store Connect → Keys |
| `APP_STORE_CONNECT_API_ISSUER_ID` | Issuer ID | Top of API Keys page |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | Full .p8 file contents | Downloaded file |
| `MATCH_PASSWORD` | Encryption password | Create a strong password |
| `MATCH_GIT_BASIC_AUTH` | `username:token` | GitHub PAT with repo access |
| `MATCH_GIT_URL` | Certificate repo URL | `https://github.com/you/jobsight-certificates.git` |
| `TEAM_ID` | Apple Team ID | Developer Portal → Membership |
| `VITE_SUPABASE_URL` | Supabase URL | Your Supabase project |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Your Supabase project |

### 6. Update Fastlane Configuration

Edit `ios/App/fastlane/Appfile`:
```ruby
app_identifier("com.jobsightapp.app")
apple_id("your-apple-id@email.com")
team_id("YOUR_TEAM_ID")
itc_team_id("YOUR_TEAM_ID")
```

Edit `ios/App/fastlane/Matchfile`:
```ruby
git_url("https://github.com/YOUR_USERNAME/jobsight-certificates.git")
```

### 7. First Build (Certificate Generation)

For the first build, certificates need to be generated:

1. Go to **Actions** → **iOS Build & Deploy**
2. Click **Run workflow**
3. Add environment variable: `MATCH_READONLY=false`
4. Select `beta` lane
5. Run workflow

After first successful build, certificates are stored encrypted in your private repo.

### 8. Subsequent Builds

Push to `main` branch or manually trigger:
- **beta**: Uploads to TestFlight
- **release**: Uploads to App Store Connect

## Build Commands

### Automated (GitHub Actions)

```bash
# Triggered automatically on push to main
# Or manually via Actions → iOS Build & Deploy
```

### Local Development (Requires Mac)

```bash
# Build web app
npm run build
npx cap sync ios

# Open in Xcode
npx cap open ios

# Or use Fastlane
cd ios/App
bundle install
bundle exec fastlane beta
```

## Fastlane Lanes

| Lane | Description |
|------|-------------|
| `certificates` | Fetch/create signing certificates |
| `beta` | Build and upload to TestFlight |
| `release` | Build and upload to App Store |
| `build_only` | Build IPA without uploading |

## App Store Checklist

### App Information
- [ ] App name: `JobSight`
- [ ] Subtitle (30 chars max)
- [ ] Description (4000 chars max)
- [ ] Keywords (100 chars max)
- [ ] Category: Business or Productivity
- [ ] Support URL
- [ ] Privacy Policy URL

### Screenshots (Required)
| Device | Size | Example |
|--------|------|---------|
| 6.7" iPhone | 1290 x 2796 px | iPhone 15 Pro Max |
| 6.5" iPhone | 1284 x 2778 px | iPhone 14 Plus |
| 5.5" iPhone | 1242 x 2208 px | iPhone 8 Plus |
| 12.9" iPad Pro | 2048 x 2732 px | iPad Pro |

**Tip**: Use [Rotato](https://rotato.app/) or [Screenshots.pro](https://screenshots.pro/) for device mockups.

### App Review Information
- [ ] Demo account credentials (for login testing)
- [ ] Contact phone and email
- [ ] Notes explaining special features

### Export Compliance
- [ ] Encryption: Select "No" if using HTTPS only

## Version Numbering

- **Version** (CFBundleShortVersionString): `1.0.0` - User-visible
- **Build** (CFBundleVersion): Auto-generated timestamp `202412281530`

The build number is automatically incremented by Fastlane using timestamps.

## Troubleshooting

### Certificate Issues

```bash
# Reset and regenerate certificates (run in CI with MATCH_READONLY=false)
# Or delete from jobsight-certificates repo and re-run
```

### Build Fails with Signing Errors

1. Check that App ID matches: `com.jobsightapp.app`
2. Verify Team ID is correct in Appfile
3. Ensure certificates repo has correct permissions

### "No provisioning profile" Error

1. Verify App ID is registered in Apple Developer Portal
2. Check that capabilities (Push Notifications) are enabled
3. Re-run with `MATCH_READONLY=false` to regenerate

### GitHub Actions Timeout

The workflow has a 60-minute timeout. If builds consistently fail:
1. Check Xcode version compatibility
2. Verify all secrets are set correctly
3. Check certificate repo accessibility

## GitHub Actions Workflow

The workflow at `.github/workflows/ios-build.yml`:

- **Trigger**: Push to `main` (paths: src/**, ios/**, package.json) or manual
- **Runner**: `macos-14` (macOS Sonoma with Xcode 15)
- **Steps**:
  1. Checkout code
  2. Setup Node.js 20
  3. Install dependencies
  4. Build web app with environment variables
  5. Sync Capacitor iOS
  6. Setup Ruby and Fastlane
  7. Configure API key
  8. Run Fastlane lane
  9. Upload IPA artifact

## Security Notes

- Never commit `.p8` files or certificates to the main repo
- Use GitHub Secrets for all sensitive values
- Certificate repo should be private
- `MATCH_PASSWORD` encrypts certificates at rest
- Rotate API keys periodically

## Resources

- [Fastlane Documentation](https://docs.fastlane.tools)
- [Fastlane Match Guide](https://docs.fastlane.tools/actions/match/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
