#!/bin/bash
# Regenerate TypeScript types from Supabase
# Usage: ./scripts/regenerate-types.sh <project-ref>

if [ -z "$1" ]; then
    echo "Usage: ./scripts/regenerate-types.sh <project-ref>"
    echo ""
    echo "Get your project ref from Supabase Dashboard > Project Settings > General"
    echo "Example: ./scripts/regenerate-types.sh abcdefghijklmnop"
    exit 1
fi

PROJECT_REF=$1

echo ""
echo "Regenerating TypeScript types from Supabase..."
echo "Project: $PROJECT_REF"
echo ""

npx supabase gen types typescript --project-id "$PROJECT_REF" > src/types/database.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Types regenerated successfully!"
    echo "   Output: src/types/database.ts"
    echo ""
    echo "Next steps:"
    echo "   1. Restart TypeScript server in your editor"
    echo "   2. Run: npm run type-check"
else
    echo ""
    echo "❌ Failed to regenerate types"
    echo "   Make sure you're logged in: npx supabase login"
    echo "   And project is linked: npx supabase link --project-ref $PROJECT_REF"
fi
