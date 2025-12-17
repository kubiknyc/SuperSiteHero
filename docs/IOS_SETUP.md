# iOS Setup Guide for JobSight

This guide covers the complete setup process for building and deploying JobSight as a native iOS application using Capacitor.

## Prerequisites

1. **macOS** - Required for iOS development
2. **Xcode 15+** - Download from Mac App Store
3. **Apple Developer Account** - Required for device testing and App Store distribution
4. **Node.js 18+** - For building the web app
5. **CocoaPods** (optional) - `sudo gem install cocoapods`

## Quick Start

```bash
# Install dependencies
npm install

# Build the web app
npm run build

# Sync with iOS project
npm run cap:sync

# Open in Xcode
npm run cap:open:ios
```

## Project Structure

```
ios/
  App/
    App/
      Info.plist           # iOS permissions and configuration
      Assets.xcassets/     # App icons and splash screens
        AppIcon.appiconset/
        Splash.imageset/
      public/              # Web assets (copied from dist/)
    App.xcodeproj/         # Xcode project file
    Podfile                # CocoaPods dependencies
```

## Configured Permissions

The following permissions are configured in `ios/App/App/Info.plist`:

| Permission | Key | Purpose |
|------------|-----|---------|
| Camera | NSCameraUsageDescription | Capture construction photos, videos, document scans |
| Photo Library | NSPhotoLibraryUsageDescription | Upload existing photos for reports |
| Photo Library Add | NSPhotoLibraryAddUsageDescription | Save captured photos to library |
| Location (When In Use) | NSLocationWhenInUseUsageDescription | Geotag photos, site check-ins, weather data |
| Location (Always) | NSLocationAlwaysAndWhenInUseUsageDescription | Background site tracking |
| Microphone | NSMicrophoneUsageDescription | Voice memos, dictation, video audio |
| Face ID | NSFaceIDUsageDescription | Biometric authentication |
| Local Network | NSLocalNetworkUsageDescription | Offline data sync |

## App Store Connect Configuration

### 1. Create App ID

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to Certificates, Identifiers & Profiles
3. Create new App ID:
   - **Bundle ID**: `com.jobsightapp.app`
   - **Capabilities**: Enable Push Notifications, Associated Domains

### 2. Create Provisioning Profiles

**Development Profile:**
1. Select "iOS App Development"
2. Select your App ID
3. Select development certificates
4. Select test devices
5. Name: `JobSight Development`

**Distribution Profile:**
1. Select "App Store Connect"
2. Select your App ID
3. Select distribution certificate
4. Name: `JobSight Distribution`

### 3. Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. My Apps > + > New App
3. Fill in:
   - **Platform**: iOS
   - **Name**: JobSight
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: com.jobsightapp.app
   - **SKU**: jobsight-ios

## Building for App Store

### 1. Configure Signing in Xcode

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the "App" target
3. Go to "Signing & Capabilities"
4. Select your Team
5. Ensure "Automatically manage signing" is checked

### 2. Update Version Numbers

In Xcode, under "General":
- **Version**: 1.0.0 (marketing version)
- **Build**: 1 (increment for each upload)

Or edit directly in `capacitor.config.ts` and run sync.

### 3. Archive and Upload

```bash
# Build production web assets
npm run build

# Sync to iOS
npx cap sync ios

# Open Xcode
npx cap open ios
```

In Xcode:
1. Select "Any iOS Device" as target
2. Product > Archive
3. Window > Organizer
4. Select archive > Distribute App
5. Choose "App Store Connect"
6. Upload

## Testing

### Simulator Testing

```bash
# Run on iOS simulator
npm run cap:run:ios

# Or with live reload during development
npx cap run ios --livereload --external
```

### Device Testing

1. Connect iOS device via USB
2. Trust the computer on your device
3. In Xcode, select your device as the target
4. Click Run or use:

```bash
npx cap run ios --target [DEVICE_ID]
```

To list available devices:
```bash
npx cap run ios --list
```

## App Icons

Replace the default icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`:

| Size | Scale | Filename | Purpose |
|------|-------|----------|---------|
| 1024x1024 | 1x | AppIcon-512@2x.png | App Store |

For a complete icon set, generate icons at:
- https://appicon.co/
- https://makeappicon.com/

Place all generated icons in the appiconset folder and update `Contents.json`.

## Splash Screens

Splash images are in `ios/App/App/Assets.xcassets/Splash.imageset/`:

| Scale | Filename | Size |
|-------|----------|------|
| 1x | splash-2732x2732-2.png | 2732x2732 |
| 2x | splash-2732x2732-1.png | 2732x2732 |
| 3x | splash-2732x2732.png | 2732x2732 |

The splash screen uses a centered image on the configured background color (#2563eb).

## Deep Linking

The app is configured for deep linking with:

**URL Schemes:**
- `jobsight://`
- `com.jobsightapp.app://`

**Universal Links (requires HTTPS):**
- `https://app.jobsight.com/*`
- `https://jobsight.netlify.app/*`

To enable universal links:
1. Add Associated Domains capability in Xcode
2. Host `apple-app-site-association` file at:
   `https://your-domain.com/.well-known/apple-app-site-association`

Example file:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.jobsightapp.app",
        "paths": ["*"]
      }
    ]
  }
}
```

## Push Notifications

Push notifications require:

1. **APNs Key** - Create in Apple Developer Portal
2. **Enable capability** - In Xcode, add "Push Notifications" capability
3. **Backend configuration** - Configure your server with the APNs key

The app is pre-configured to handle:
- Badge updates
- Sound notifications
- Alert banners

## Troubleshooting

### Common Issues

**"No signing certificate" error:**
- Ensure you're signed into your Apple Developer account in Xcode
- Check that your provisioning profiles are downloaded

**"No such module" errors:**
- Run `npx cap sync ios`
- In Xcode: Product > Clean Build Folder

**White screen after launch:**
- Check that web assets are in `ios/App/App/public/`
- Verify `capacitor.config.ts` webDir is correct

**Camera/Location not working:**
- Verify permissions are in Info.plist
- Check iOS Settings > Privacy for the app

### Useful Commands

```bash
# Clean and rebuild
rm -rf ios/App/App/public
npm run build
npx cap sync ios

# Clear Xcode build cache
# In Xcode: Product > Clean Build Folder (Cmd+Shift+K)

# Check installed plugins
npx cap ls

# Update Capacitor
npm update @capacitor/core @capacitor/ios
npx cap sync
```

## CI/CD Integration

For automated builds, consider:

1. **Fastlane** - Automate screenshots, builds, and deployment
2. **GitHub Actions** - Build on macOS runners
3. **Bitrise** - Mobile-focused CI/CD
4. **App Center** - Microsoft's mobile DevOps

Example GitHub Actions workflow for iOS:

```yaml
name: iOS Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npx cap sync ios
      - name: Build iOS
        run: |
          xcodebuild -workspace ios/App/App.xcworkspace \
            -scheme App \
            -sdk iphoneos \
            -configuration Release \
            archive
```

## Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)

## Support

For issues specific to the iOS build:
1. Check the troubleshooting section above
2. Review Xcode build logs
3. Check Capacitor community forums
4. Open an issue in the project repository
