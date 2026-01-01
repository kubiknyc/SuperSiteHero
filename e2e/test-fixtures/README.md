# E2E Test Fixtures

This directory contains test fixtures used in end-to-end tests.

## Files

### test-image.png
A minimal 1x1 pixel transparent PNG image used for testing file upload functionality.
- Size: ~68 bytes
- Format: PNG
- Dimensions: 1x1 pixels
- Use case: Testing image attachment in messaging and other file upload features

## Usage

Test fixtures are referenced in test files using relative paths:

```typescript
import path from 'path'

const testImagePath = path.join(__dirname, '..', 'test-fixtures', 'test-image.png')
await messagingPage.attachFile(testImagePath)
```

## Adding New Fixtures

To add new test fixtures:

1. Add the file to this directory
2. Document it in this README
3. Keep files small (< 1MB) to avoid bloating the repository
4. Use descriptive file names (e.g., `test-pdf-document.pdf`, `test-spreadsheet.xlsx`)
