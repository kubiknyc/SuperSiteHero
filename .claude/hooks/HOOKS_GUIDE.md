# Claude Code Hooks Guide

Hooks are shell commands that execute automatically in response to Claude Code events. They help automate common development workflows.

## Available Hook Types

1. **user-prompt-submit-hook** - Runs when user submits a prompt
2. **tool-call-hook** - Runs before a tool is executed
3. **tool-result-hook** - Runs after a tool completes

## Configuration

Hooks are configured in `.claude/settings.local.json`:

```json
{
  "permissions": {
    // ... existing permissions
  },
  "hooks": {
    "user-prompt-submit-hook": "echo 'User submitted: $PROMPT'",
    "tool-call-hook": "./path/to/script.sh",
    "tool-result-hook": "npm run lint"
  }
}
```

## Example Hooks for Construction Platform

### 1. Pre-Type Check Hook

Run type checking before file modifications:

```json
{
  "hooks": {
    "tool-call-hook": "if [[ $TOOL_NAME == 'Edit' || $TOOL_NAME == 'Write' ]]; then npm run type-check; fi"
  }
}
```

### 2. Auto-Format Hook

Format code after file writes:

```json
{
  "hooks": {
    "tool-result-hook": "if [[ $TOOL_NAME == 'Edit' || $TOOL_NAME == 'Write' ]]; then npx prettier --write $FILE_PATH 2>/dev/null || true; fi"
  }
}
```

### 3. Database Migration Validator

Validate migration syntax before running:

```json
{
  "hooks": {
    "tool-call-hook": "if [[ $FILE_PATH == *'migrations/'*.sql ]]; then ./.claude/hooks/validate-migration.sh $FILE_PATH; fi"
  }
}
```

### 4. Sync Types After Schema Changes

Auto-generate TypeScript types after database changes:

```json
{
  "hooks": {
    "tool-result-hook": "if [[ $FILE_PATH == *'migrations/'* ]]; then echo '⚠️ Remember to run /supabase-type-generator --all-tables'; fi"
  }
}
```

## Hook Scripts

### validate-migration.sh

```bash
#!/bin/bash
# .claude/hooks/validate-migration.sh

FILE=$1

# Check if file exists
if [ ! -f "$FILE" ]; then
  echo "❌ Migration file not found: $FILE"
  exit 1
fi

# Check for required migration structure
if ! grep -q "CREATE TABLE\|ALTER TABLE\|DROP TABLE" "$FILE"; then
  echo "⚠️ Warning: No table operations found in migration"
fi

# Check for RLS policies
if ! grep -q "ENABLE ROW LEVEL SECURITY\|CREATE POLICY" "$FILE"; then
  echo "⚠️ Warning: No RLS policies found. Multi-tenant security may be compromised!"
fi

# Check for company_id
if grep -q "CREATE TABLE" "$FILE" && ! grep -q "company_id" "$FILE"; then
  echo "⚠️ Warning: New table missing company_id for multi-tenant isolation"
fi

echo "✅ Migration validation complete"
```

### check-types.sh

```bash
#!/bin/bash
# .claude/hooks/check-types.sh

echo "🔍 Running type check..."

if npm run type-check 2>&1 | grep -q "error TS"; then
  echo "❌ Type errors found. Please fix before proceeding."
  exit 1
else
  echo "✅ No type errors"
fi
```

### lint-changed.sh

```bash
#!/bin/bash
# .claude/hooks/lint-changed.sh

FILE=$1

if [[ $FILE == *.ts || $FILE == *.tsx ]]; then
  echo "🔍 Linting $FILE..."
  npx eslint "$FILE" --fix || echo "⚠️ Lint errors found"
fi
```

## Recommended Hooks for This Project

Add these to your `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      // ... existing permissions
      "Bash(npm run type-check:*)",
      "Bash(npx eslint:*)",
      "Bash(npx prettier:*)"
    ]
  },
  "hooks": {
    "tool-call-hook": [
      "# Validate migrations before writing",
      "if [[ $TOOL_NAME == 'Write' && $FILE_PATH == *'migrations/'*.sql ]]; then",
      "  if ! grep -q 'company_id' <<< \"$CONTENT\"; then",
      "    echo '⚠️ Warning: Migration may be missing company_id for multi-tenant isolation';",
      "  fi;",
      "  if ! grep -q 'ROW LEVEL SECURITY\\|CREATE POLICY' <<< \"$CONTENT\"; then",
      "    echo '⚠️ Warning: Migration may be missing RLS policies';",
      "  fi;",
      "fi"
    ],
    "tool-result-hook": [
      "# Remind to update types after migrations",
      "if [[ $TOOL_NAME == 'Write' && $FILE_PATH == *'migrations/'* && $SUCCESS == 'true' ]]; then",
      "  echo '💡 Tip: Run /supabase-type-generator --all-tables to sync TypeScript types';",
      "fi;",
      "# Check types after editing TypeScript files",
      "if [[ $TOOL_NAME == 'Edit' && $FILE_PATH == *.ts* && $SUCCESS == 'true' ]]; then",
      "  echo '🔍 Running type check...';",
      "  npm run type-check 2>&1 | head -n 20 || true;",
      "fi"
    ]
  }
}
```

## Hook Variables

Available environment variables in hooks:

- `$TOOL_NAME` - Name of the tool being called (Edit, Write, Bash, etc.)
- `$FILE_PATH` - Path to the file being operated on (if applicable)
- `$PROMPT` - User's prompt text (in user-prompt-submit-hook)
- `$SUCCESS` - Whether tool succeeded (in tool-result-hook)
- `$CONTENT` - Content being written (in Write tool)

## Best Practices

1. **Keep hooks fast**: Slow hooks delay Claude's responses
2. **Fail gracefully**: Use `|| true` to prevent blocking on errors
3. **Provide feedback**: Echo messages to inform the user what's happening
4. **Test hooks**: Run them manually before adding to config
5. **Use conditionals**: Only run hooks when relevant (`if [[ condition ]]; then`)
6. **Security**: Be careful with hooks that execute arbitrary code

## Debugging Hooks

To debug hooks:

1. Add `set -x` at the start of your script for verbose output
2. Redirect output to a log file: `>> /tmp/claude-hooks.log 2>&1`
3. Use `echo` statements liberally
4. Test hook scripts manually from command line

## Disabling Hooks

To temporarily disable hooks, comment them out:

```json
{
  "hooks": {
    // "tool-call-hook": "npm run type-check"
  }
}
```

Or remove the `hooks` section entirely.

## Hook Examples by Use Case

### Prevent Committing Secrets

```bash
if [[ $TOOL_NAME == 'Write' && $FILE_PATH == *.env ]]; then
  if git check-ignore "$FILE_PATH"; then
    echo "✅ .env file is gitignored"
  else
    echo "❌ ERROR: .env file is not gitignored! Add it to .gitignore"
    exit 1
  fi
fi
```

### Auto-Update Dependencies

```bash
if [[ $FILE_PATH == 'package.json' && $SUCCESS == 'true' ]]; then
  echo "📦 Running npm install..."
  npm install
fi
```

### Notify on Critical File Changes

```bash
if [[ $FILE_PATH == 'src/types/database.ts' ]]; then
  echo "⚠️ Critical file changed: database types"
  echo "💡 Make sure changes match your Supabase schema"
fi
```

## Platform-Specific Notes

### Windows (PowerShell)

For Windows, use PowerShell syntax:

```json
{
  "hooks": {
    "tool-call-hook": "if ($env:TOOL_NAME -eq 'Edit') { npm run type-check }"
  }
}
```

### macOS/Linux (Bash)

Use bash syntax as shown in examples above.

## Support

- Claude Code Hooks Docs: https://docs.anthropic.com/claude-code/hooks
- Project Issues: Report hook problems in GitHub issues
