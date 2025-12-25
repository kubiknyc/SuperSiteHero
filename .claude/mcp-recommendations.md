# Recommended MCP Servers for Testing

## 1. Testing & Coverage MCP Servers

### **Codecov MCP** (if available)
- Real-time coverage reporting
- Coverage diff visualization
- Integration with GitHub PRs

### **Playwright Inspector MCP** (if available)
- Debug E2E tests interactively
- Generate test code from UI interactions
- View test traces

### **Test Runner MCP** (if available)
- Run tests from Claude Code
- Watch mode integration
- Coverage reporting

## 2. Database Testing MCP Servers

### **Supabase CLI MCP** (if available)
- Run local Supabase instance
- Execute migrations
- Test RLS policies
- Reset test database

### **PostgreSQL MCP** (if available)
- Direct database queries for test setup
- Test data seeding
- Performance profiling

## 3. CI/CD Integration MCP Servers

### **GitHub Actions MCP** (if available)
- Trigger test workflows
- View workflow status
- Download artifacts

## 4. Performance Testing MCP Servers

### **k6 MCP** (if available)
- Run load tests
- Performance metrics
- Stress testing

## Installation

Check available MCP servers:
```bash
claude mcp list
```

Install recommended servers:
```bash
claude mcp install <server-name>
```

## Configuration

Add to `.claude/settings.json`:
```json
{
  "mcp": {
    "servers": {
      "supabase": {
        "enabled": true,
        "config": {
          "projectRef": "your-project-ref"
        }
      },
      "playwright": {
        "enabled": true
      }
    }
  }
}
```
