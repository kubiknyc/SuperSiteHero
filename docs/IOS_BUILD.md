# iOS Build Guide for JobSight

Complete guide for building, testing, and deploying JobSight to the iOS App Store.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Project Configuration](#project-configuration)
4. [Build Process](#build-process)
5. [Testing](#testing)
6. [TestFlight Deployment](#testflight-deployment)
7. [App Store Submission](#app-store-submission)
8. [Plugin Compatibility](#plugin-compatibility)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Minimum Version | Download |
|----------|-----------------|----------|
| macOS | 13.0 (Ventura) or later | Built-in |
| Xcode | 15.0 or later | [Mac App Store](https://apps.apple.com/app/xcode/id497799835) |
| Node.js | 18.0 or later | [nodejs.org](https://nodejs.org/) |
| CocoaPods | 1.14.0 or later | `sudo gem install cocoapods` |

### Required Accounts

1. **Apple Developer Account** ($99/year)
   - Sign up at [developer.apple.com](https://developer.apple.com/)
   - Required for device testing and App Store distribution
   - Provides access to provisioning profiles and certificates

2. **App Store Connect Access**
   - Available after Apple Developer enrollment
   - Used for TestFlight and App Store submissions

### Xcode Setup

After installing Xcode:

```bash
# Install Xcode command line tools
xcode-select --install

# Accept Xcode license
sudo xcodebuild -license accept

# Verify installation
xcodebuild -version
```

---

## Quick Start

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd jobsight
npm install

# 2. Build web assets
npm run build

# 3. Sync iOS project
npx cap sync ios

# 4. Open in Xcode
npm run ios:build
# Or manually: npx cap open ios
```

---

## Project Configuration

### Bundle Identifier

The app uses the following bundle identifier (configured in `capacitor.config.ts`):

```
com.jobsightapp.app
```

This must match your App ID in the Apple Developer Portal.

### App Information

| Field | Value |
|-------|-------|
| App Name | JobSight |
| Bundle ID | com.jobsightapp.app |
| URL Scheme | jobsight:// |
| Minimum iOS | 14.0 |

### Configured Permissions

The following permissions are configured in `ios/App/App/Info.plist`:

| Permission | Key | Description |
|------------|-----|-------------|
| Camera | `NSCameraUsageDescription` | Capture photos/videos of construction sites |
| Photo Library | `NSPhotoLibraryUsageDescription` | Access photos from library |
| Photo Library (Add) | `NSPhotoLibraryAddUsageDescription` | Save photos to library |
| Location (When In Use) | `NSLocationWhenInUseUsageDescription` | Geotag photos, site check-ins |
| Location (Always) | `NSLocationAlwaysAndWhenInUseUsageDescription` | Background site tracking |
| Microphone | `NSMicrophoneUsageDescription` | Record audio for meetings/voice messages |
| Face ID | `NSFaceIDUsageDescription` | Biometric authentication |
| Motion/Gyroscope | `NSMotionUsageDescription` | 360-degree photo viewing |
| Local Network | `NSLocalNetworkUsageDescription` | Offline data sync |

### iOS-Specific Configuration

From `capacitor.config.ts`:

```typescript
ios: {
  contentInset: 'always',
  allowsLinkPreview: false,
  preferredContentMode: 'mobile',
  scheme: 'jobsight',
  scrollEnabled: true,
  webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production',
  limitsNavigationsToAppBoundDomains: true,
  backgroundColor: '#2563eb',
}
```

---

## Build Process

### Development Build

```bash
# Build and run on simulator
npm run ios:test

# Or step by step:
npm run build
npx cap sync ios
npx cap run ios
```

### Production Build

```bash
# Build for production
npm run ios:build:prod

# Open Xcode for archiving
npx cap open ios
```

### Build Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run ios:build` | Build web, sync, and open Xcode |
| `npm run ios:build:prod` | Production build with sync |
| `npm run ios:test` | Build and run on simulator |
| `npm run cap:sync:ios` | Sync web assets to iOS |
| `npm run cap:open:ios` | Open iOS project in Xcode |
| `npm run cap:run:ios` | Run on simulator |
| `npm run cap:live:ios` | Run with live reload |

---

## Testing

### Simulator Testing

```bash
# Run on default simulator
npm run cap:run:ios

# List available simulators
xcrun simctl list devices

# Run on specific simulator
npx cap run ios --target "iPhone 15 Pro"
```

### Device Testing

1. **Register Device**
   - Get UDID: Connect device, open Finder, click on iPhone name
   - Add to Apple Developer Portal > Devices

2. **Connect Device**
   ```bash
   # List connected devices
   npx cap run ios --list

   # Run on specific device
   npx cap run ios --target <DEVICE_ID>
   ```

3. **Trust Developer**
   - On iPhone: Settings > General > VPN & Device Management
   - Trust your developer certificate

### Live Reload Development

```bash
# Start with live reload (requires same network)
npm run cap:live:ios
```

### Testing Checklist

Before submitting to TestFlight, verify these features work on device:

- [ ] Camera capture (photo and video)
- [ ] Photo library access
- [ ] Geolocation accuracy
- [ ] Offline mode and data sync
- [ ] Push notifications
- [ ] Biometric authentication (Face ID/Touch ID)
- [ ] 360-degree photo viewing with gyroscope
- [ ] Deep linking (jobsight://)
- [ ] Background fetch
- [ ] App switching and resume
- [ ] Portrait and landscape orientations
- [ ] Safe area handling (notch, home indicator)

---

## TestFlight Deployment

### Step 1: Configure Signing

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the "App" target
3. Go to **Signing & Capabilities**
4. Select your Team
5. Enable "Automatically manage signing"

### Step 2: Set Version Numbers

In Xcode, under **General**:

| Field | Description |
|-------|-------------|
| Version | Marketing version (e.g., 1.0.0) |
| Build | Increment for each upload (e.g., 1, 2, 3...) |

### Step 3: Create Archive

1. Select **Any iOS Device (arm64)** as build target
2. **Product** > **Archive**
3. Wait for build to complete

### Step 4: Upload to App Store Connect

1. **Window** > **Organizer**
2. Select latest archive
3. **Distribute App**
4. Select **App Store Connect**
5. Choose **Upload**
6. Follow prompts to complete upload

### Step 5: TestFlight Setup

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Go to **TestFlight** tab
4. Wait for build processing (10-30 minutes)
5. Fill in compliance information
6. Add testers:
   - **Internal**: Up to 100 team members, no review needed
   - **External**: Up to 10,000 testers, requires App Review

---

## App Store Submission

### Pre-Submission Checklist

- [ ] App icon (1024x1024, no alpha/transparency)
- [ ] Screenshots for all required device sizes
- [ ] App description (up to 4000 characters)
- [ ] Keywords (up to 100 characters)
- [ ] Support URL
- [ ] Privacy Policy URL
- [ ] Age rating information
- [ ] Export compliance information

### Required Screenshots

| Device | Size | Required |
|--------|------|----------|
| iPhone 6.7" | 1290 x 2796 | Yes |
| iPhone 6.5" | 1284 x 2778 | Yes |
| iPhone 5.5" | 1242 x 2208 | Optional |
| iPad Pro 12.9" | 2048 x 2732 | If iPad supported |

### Submission Process

1. Go to App Store Connect
2. Select app > **App Store** tab
3. Fill in all required information
4. Select build from TestFlight
5. **Submit for Review**

### Review Timeline

- First submission: 24-48 hours typical
- Updates: 24 hours typical
- Rejections: Address issues and resubmit

### Common Rejection Reasons

1. **Incomplete metadata** - Missing screenshots, description
2. **Privacy issues** - Missing privacy policy, permission explanations
3. **Crashes** - Test thoroughly before submission
4. **Placeholder content** - Remove all test/lorem ipsum content
5. **Login issues** - Provide demo account for reviewers

---

## Plugin Compatibility

### Capacitor Plugins Used

All plugins are verified to work on iOS:

| Plugin | Version | iOS Support |
|--------|---------|-------------|
| @capacitor/camera | 8.0.0 | Full |
| @capacitor/geolocation | 8.0.0 | Full |
| @capacitor/filesystem | 8.0.0 | Full |
| @capacitor/haptics | 8.0.0 | Full |
| @capacitor/keyboard | 8.0.0 | Full |
| @capacitor/network | 8.0.0 | Full |
| @capacitor/share | 8.0.0 | Full |
| @capacitor/splash-screen | 8.0.0 | Full |
| @capacitor/status-bar | 8.0.0 | Full |
| @capacitor/device | 8.0.0 | Full |
| @capacitor/app | 8.0.0 | Full |
| @capacitor-community/media | 8.0.1 | Full |

### Testing Plugin Features

```typescript
// Camera
import { Camera, CameraResultType } from '@capacitor/camera';
const photo = await Camera.getPhoto({
  quality: 90,
  allowEditing: false,
  resultType: CameraResultType.Uri
});

// Geolocation
import { Geolocation } from '@capacitor/geolocation';
const position = await Geolocation.getCurrentPosition({
  enableHighAccuracy: true
});

// Haptics
import { Haptics, ImpactStyle } from '@capacitor/haptics';
await Haptics.impact({ style: ImpactStyle.Medium });

// Device Info
import { Device } from '@capacitor/device';
const info = await Device.getInfo();
console.log(info.platform); // 'ios'
```

---

## Troubleshooting

### Build Errors

**"No signing certificate"**
```bash
# Refresh certificates in Xcode
# Xcode > Preferences > Accounts > Download Manual Profiles
```

**"No such module 'Capacitor'"**
```bash
npx cap sync ios
cd ios/App && pod install && cd ../..
```

**"Pods not found"**
```bash
cd ios/App
pod deintegrate
pod install
cd ../..
```

### Runtime Issues

**White screen after launch**
```bash
# Verify web assets
ls ios/App/App/public/

# Rebuild
rm -rf ios/App/App/public
npm run build
npx cap sync ios
```

**Camera not working**
1. Check Info.plist has NSCameraUsageDescription
2. Verify permission in iOS Settings > Privacy > Camera

**Location issues**
1. Check Info.plist permissions
2. Enable Location Services in iOS Settings
3. Test with actual device (simulator location is simulated)

### Xcode Issues

**Clean build folder**
- Xcode: **Product** > **Clean Build Folder** (Cmd+Shift+K)

**Reset derived data**
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```

**Xcode hangs on indexing**
- Close Xcode
- Delete DerivedData
- Reopen project

### Useful Commands

```bash
# Check Capacitor status
npx cap doctor

# List installed plugins
npx cap ls

# Update Capacitor
npm update @capacitor/core @capacitor/ios @capacitor/cli
npx cap sync

# Open iOS project directly
open ios/App/App.xcworkspace
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: iOS Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-ios:
    runs-on: macos-14

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build web assets
        run: npm run build

      - name: Sync iOS
        run: npx cap sync ios

      - name: Setup Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: '15.0'

      - name: Build iOS
        run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
            -scheme App \
            -sdk iphonesimulator \
            -configuration Debug \
            -destination 'platform=iOS Simulator,name=iPhone 15' \
            build
```

### Fastlane Integration

```ruby
# ios/App/fastlane/Fastfile
default_platform(:ios)

platform :ios do
  desc "Build and upload to TestFlight"
  lane :beta do
    build_app(
      workspace: "App.xcworkspace",
      scheme: "App"
    )
    upload_to_testflight
  end
end
```

---

## Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)

---

## Support

For iOS-specific issues:

1. Check this guide's troubleshooting section
2. Review Xcode build logs
3. Check [Capacitor Community Forums](https://forum.ionicframework.com/c/capacitor)
4. Open an issue in the project repository
