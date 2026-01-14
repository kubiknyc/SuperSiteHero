import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Skip in CI environments (Vercel, GitHub Actions, etc.)
if (process.env.CI || process.env.VERCEL) {
    console.log('Skipping IDE config fix in CI environment');
    process.exit(0);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const pathsToFix = [
    'node_modules/@capacitor/android/capacitor',
    'node_modules/@capacitor/app/android',
    'node_modules/@capacitor/camera/android',
    'node_modules/@capacitor/device/android',
    'node_modules/@capacitor/geolocation/android',
    'node_modules/@capacitor/haptics/android',
    'node_modules/@capacitor/keyboard/android',
    'node_modules/@capacitor/network/android'
];

console.log('Checking for missing IDE configuration folders...');

pathsToFix.forEach(relativePath => {
    const fullPath = path.join(projectRoot, relativePath);

    if (fs.existsSync(fullPath)) {
        const settingsPath = path.join(fullPath, '.settings');
        if (!fs.existsSync(settingsPath)) {
            try {
                fs.mkdirSync(settingsPath);
                console.log(`Created: ${relativePath}/.settings`);

                // Create a dummy file to ensure the folder is not treated as empty
                const prefsPath = path.join(settingsPath, 'org.eclipse.core.resources.prefs');
                fs.writeFileSync(prefsPath, 'eclipse.preferences.version=1');
                console.log(`Created prefs file in: ${relativePath}/.settings`);

            } catch (err) {
                console.error(`Error creating ${settingsPath} or prefs file:`, err.message);
            }
        } else {
            console.log(`Exists: ${relativePath}/.settings`);

            // Ensure prefs file exists even if folder existed
            const prefsPath = path.join(settingsPath, 'org.eclipse.core.resources.prefs');
            if (!fs.existsSync(prefsPath)) {
                try {
                    fs.writeFileSync(prefsPath, 'eclipse.preferences.version=1');
                    console.log(`Created missing prefs file in: ${relativePath}/.settings`);
                } catch (err) {
                    console.error(`Error creating prefs file in ${settingsPath}:`, err.message);
                }
            }
        }
    } else {
        console.log(`Parent not found: ${fullPath}`);
    }
});

console.log('IDE configuration check complete.');
