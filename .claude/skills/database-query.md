# Database Query Skill

Query the Supabase database directly using SQL or the Supabase MCP server.

## Usage

Invoke this skill when you need to:
- Query database tables
- Inspect schema
- Test RLS policies
- Analyze data
- Debug database issues

## Examples

**Query projects**:
```
Use database-query skill to show all active projects
```

**Check user roles**:
```
Use database-query skill to count users by role
```

**Inspect table structure**:
```
Use database-query skill to describe the daily_reports table
```

## Execution

When this skill is invoked, use the Supabase or PostgreSQL MCP server to:

1. Understand the query requirements
2. Construct appropriate SQL or use Supabase client
3. Execute the query
4. Format and return results
5. Provide insights if requested

## Important Notes

- Always respect RLS policies (read-only access)
- Include company_id filtering for multi-tenant queries
- Limit results to avoid overwhelming output (use LIMIT)
- Format results in readable tables
- Suggest indexes if performance issues detected

## Database Context

From CLAUDE.md:
- Multi-tenant SaaS with company_id isolation
- 42 tables including projects, daily_reports, RFIs, change_orders
- RLS policies enforce security
- Connection pooling on port 6543
- Types defined in src/types/database.ts
