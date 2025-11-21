# Custom Claude Code Commands for Construction Management

This directory contains construction-specific slash commands to accelerate development of the SuperSiteHero platform.

## Available Commands

### 🏗️ `/create-feature`
**Purpose**: Scaffold a complete new feature following architectural patterns

**Use when**: Adding any new feature (materials tracking, inspections, etc.)

**What it does**:
- Creates feature directory structure
- Implements React Query hooks (CRUD operations)
- Generates UI components (list, detail, create dialog)
- Updates routing and navigation
- Ensures multi-tenant security
- Follows all architectural conventions

**Example**: `/create-feature` then specify "Materials Tracking"

---

### 📝 `/daily-report`
**Purpose**: Build or enhance the daily report feature

**Use when**: Implementing daily field reports for superintendents

**What it does**:
- Implements comprehensive daily reporting
- Handles workforce, equipment, deliveries, visitors
- Weather integration
- Photo management with GPS
- PDF export functionality
- Email distribution

**Key features**: Offline support, mobile-optimized, auto-save drafts

---

### 📋 `/rfi-workflow`
**Purpose**: Create RFI (Request for Information) workflow system

**Use when**: Building the RFI management feature

**What it does**:
- Auto-numbered RFI creation
- Routing and notifications
- Status workflow (draft → submitted → answered → closed)
- Response time tracking
- Document attachments
- Integration with change orders

**Key features**: SLA tracking, external user access, comprehensive reporting

---

### 🔄 `/sync-types`
**Purpose**: Sync TypeScript types with Supabase database schema

**Use when**: Database schema changes or adding new tables

**What it does**:
- Generates types from Supabase
- Updates `src/types/database.ts`
- Verifies helper types (CreateInput, UpdateInput)
- Runs type checking
- Documents breaking changes

**Key features**: Prevents type drift, ensures type safety

---

### ⚠️ `/safety-incident`
**Purpose**: Build safety incident tracking and OSHA compliance

**Use when**: Implementing safety management features

**What it does**:
- Incident reporting (mobile-optimized)
- Investigation workflow
- OSHA 300 log compliance
- Corrective action tracking
- Toolbox talks scheduling
- Safety metrics (TRIR, DART rates)

**Key features**: OSHA recordability determination, offline reporting, compliance reports

---

## How to Use These Commands

1. **In Chat**: Type the command name (e.g., `/create-feature`)
2. **Follow Prompts**: Claude will ask for specifics
3. **Review Output**: Check generated code before committing
4. **Test**: Always run `npm run type-check` after major changes

## Command Patterns

All commands follow these principles:
- ✅ Multi-tenant security (company_id, RLS)
- ✅ Feature-based architecture
- ✅ React Query for data fetching
- ✅ Shadcn/ui components
- ✅ TypeScript type safety
- ✅ Mobile-first design
- ✅ Offline considerations

## Creating New Commands

To add your own command:

1. Create a new `.md` file in this directory
2. Name it descriptively (e.g., `permit-tracking.md`)
3. Write clear instructions for Claude
4. Include context about your domain (construction)
5. Specify architectural requirements
6. Add testing checklist

### Command Template

```markdown
# Command Name

Brief description of what this command does.

## Context
Domain-specific context about construction workflows.

## Task
What Claude should implement.

## Implementation Steps
1. Step one
2. Step two
...

## Testing Checklist
- [ ] Test case 1
- [ ] Test case 2
```

## Construction Domain Commands We Could Add

Future command ideas:
- `/permit-tracking` - Building permit management
- `/change-order` - Change order workflow
- `/submittal-log` - Submittal tracking
- `/punch-list` - Punch list management
- `/material-tracking` - Delivery and inventory
- `/schedule-gantt` - Project scheduling
- `/cost-tracking` - Budget and cost management
- `/photo-management` - Progress photo organization
- `/inspection-workflow` - Inspection scheduling
- `/equipment-log` - Equipment tracking

## Tips for Best Results

1. **Be Specific**: When using commands, provide detailed requirements
2. **Review Code**: Always review generated code for security and logic
3. **Test Thoroughly**: Run type-check and manual testing
4. **Iterate**: Use commands as starting points, refine as needed
5. **Stay Consistent**: Commands enforce architectural patterns - follow them

## Integration with Supabase

The Supabase MCP server has been installed to provide:
- Direct database queries during development
- Schema inspection
- Type generation assistance
- Migration support

Use `/sync-types` regularly to keep TypeScript types in sync with your Supabase schema.

## Resources

- **CLAUDE.md**: Architecture and patterns reference
- **masterplan.md**: Complete feature specifications
- **database-schema.md**: Database documentation
- **Claude Code Docs**: https://code.claude.com/docs

## Support

If a command doesn't work as expected:
1. Check CLAUDE.md for architectural requirements
2. Verify your database schema matches expectations
3. Run `npm run type-check` to identify type issues
4. Review the command's `.md` file for specific requirements
5. Ask Claude to debug or refine the output

---

**Pro Tip**: Chain commands together! Use `/create-feature` to scaffold, then `/sync-types` to ensure types are correct, then test your feature.
