# Claude Code Agents Guide

## Overview

Your project now has **12 specialized agents** to help with different aspects of development. Agents are autonomous assistants that can handle complex, multi-step tasks.

## How to Use Agents

### Invoking an Agent

You can invoke agents in two ways:

1. **Let Claude decide**: Agents marked with "Use PROACTIVELY" will be automatically invoked when appropriate
2. **Manual invocation**: Ask Claude to use a specific agent by name

Example:
```
"Use the security-specialist agent to audit the authentication flow"
"Have the construction-domain-expert review the RFI workflow"
```

### Agent Lifecycle

When an agent is invoked:
1. Agent loads with specialized knowledge and instructions
2. Agent works autonomously on the task
3. Agent reports back with results
4. You continue conversation with updated context

## Available Agents

### 1. **debugger** 🐛
**When to use**: Errors, test failures, bugs, stack traces

**Capabilities**:
- Root cause analysis
- Error message interpretation
- Stack trace investigation
- Strategic debugging
- Fix implementation
- Verification testing

**Example tasks**:
- "Debug why the daily reports page is crashing"
- "Investigate the 403 error on project creation"
- "Find why tests are failing in CI"

**Tools**: Read, Write, Edit, Bash, Grep
**Model**: Sonnet

---

### 2. **fullstack-developer** 🚀
**When to use**: Complete feature implementation, end-to-end development

**Capabilities**:
- Frontend React development
- Backend API development
- Database design
- Full-stack architecture
- Authentication flows
- API integration
- Type-safe development

**Example tasks**:
- "Build a complete RFI feature with frontend and backend"
- "Implement user authentication with role-based access"
- "Create a new API endpoint with React hooks"

**Tools**: Read, Write, Edit, Bash
**Model**: Opus (most powerful)

---

### 3. **test-engineer** 🧪
**When to use**: Testing strategy, test automation, QA

**Capabilities**:
- E2E test development (Playwright)
- Unit test creation (Jest/Vitest)
- Test strategy planning
- Coverage analysis
- CI/CD integration
- Test fixture management

**Example tasks**:
- "Create E2E tests for the change orders workflow"
- "Improve test coverage for the projects module"
- "Set up CI/CD testing pipeline"

**Tools**: Read, Write, Edit, Bash
**Model**: Sonnet

---

### 4. **testing-specialist** 🔍
**When to use**: Test implementation, mocking, assertions

**Capabilities**:
- Writing specific tests
- Complex mocking scenarios
- Assertion patterns
- Test debugging
- Integration testing

**Example tasks**:
- "Write unit tests for the useProjects hook"
- "Create mock data for daily reports tests"
- "Fix failing authentication tests"

**Tools**: Read, Write, Edit, Bash
**Model**: Sonnet

---

### 5. **ui-component-generator** 🎨
**When to use**: UI components, forms, layouts

**Capabilities**:
- shadcn/ui components
- Responsive design
- Tailwind CSS styling
- Form components
- Accessibility
- Mobile-first design

**Example tasks**:
- "Create a RFI creation form with validation"
- "Build a responsive dashboard layout"
- "Design a mobile-friendly daily report entry form"

**Tools**: Read, Write, Edit
**Model**: Sonnet

---

### 6. **supabase-schema-architect** 🗄️
**When to use**: Database schema design, migrations

**Capabilities**:
- Database schema design
- Migration planning
- RLS policy architecture
- Index optimization
- Relationship design
- Data modeling

**Example tasks**:
- "Design database schema for equipment tracking"
- "Create migration for new weather logs feature"
- "Optimize RLS policies for performance"

**Tools**: Read, Write, Edit, Bash
**Model**: Sonnet

---

### 7. **supabase-realtime-optimizer** ⚡
**When to use**: Realtime subscriptions, performance issues

**Capabilities**:
- Realtime subscription optimization
- Connection management
- Performance tuning
- Debugging realtime issues
- Broadcast/presence patterns

**Example tasks**:
- "Optimize realtime subscriptions for daily reports"
- "Debug why realtime updates aren't showing"
- "Implement presence for online users"

**Tools**: Read, Edit, Bash, Grep
**Model**: Sonnet

---

### 8. **offline-sync-specialist** 📴 *(NEW)*
**When to use**: Offline functionality, PWA, sync issues

**Capabilities**:
- Offline-first architecture
- IndexedDB implementation
- Service Worker configuration
- Sync queue management
- Conflict resolution
- Background sync

**Example tasks**:
- "Implement offline daily report creation"
- "Set up sync queue for offline mutations"
- "Add background sync for photos"

**Tools**: Read, Write, Edit, Bash, Grep
**Model**: Sonnet

---

### 9. **react-query-expert** 🔄 *(NEW)*
**When to use**: Data fetching, React Query, caching

**Capabilities**:
- React Query hooks (useQuery, useMutation)
- Cache management
- Optimistic updates
- Infinite queries
- Prefetching
- Query invalidation

**Example tasks**:
- "Create React Query hooks for submittals"
- "Implement optimistic updates for project editing"
- "Add infinite scroll to punch list"

**Tools**: Read, Write, Edit, Grep
**Model**: Sonnet

---

### 10. **construction-domain-expert** 🏗️ *(NEW)*
**When to use**: Construction workflows, industry knowledge

**Capabilities**:
- Construction terminology
- Industry workflows (RFI, submittal, change order)
- Field management best practices
- Mobile/offline requirements
- Reporting standards
- Compliance knowledge

**Example tasks**:
- "Review the RFI workflow for completeness"
- "Design a proper change order approval process"
- "Ensure daily reports capture all required fields"

**Tools**: Read, Write, Edit, Grep
**Model**: Sonnet

---

### 11. **security-specialist** 🔒 *(NEW)*
**When to use**: Security audit, authentication, vulnerabilities

**Capabilities**:
- Multi-tenant security audit
- RLS policy verification
- Authentication flows
- Input validation
- OWASP Top 10 prevention
- Secure coding practices
- Data protection

**Example tasks**:
- "Audit the authentication system for vulnerabilities"
- "Verify all tables have proper RLS policies"
- "Check for SQL injection risks"

**Tools**: Read, Write, Edit, Bash, Grep
**Model**: Sonnet

---

### 12. **performance-optimizer** ⚡ *(NEW)*
**When to use**: Performance issues, slow loading, optimization

**Capabilities**:
- React rendering optimization
- Bundle size reduction
- Database query optimization
- Code splitting
- Image optimization
- Web Vitals improvement
- Caching strategies

**Example tasks**:
- "Optimize the projects page load time"
- "Reduce bundle size for faster loading"
- "Find and fix N+1 query issues"

**Tools**: Read, Write, Edit, Bash, Grep
**Model**: Sonnet

---

## Agent Selection Guide

### Feature Development
- **New feature**: fullstack-developer
- **UI only**: ui-component-generator
- **Database**: supabase-schema-architect
- **API integration**: react-query-expert

### Debugging & Fixing
- **Errors/bugs**: debugger
- **Security issues**: security-specialist
- **Performance**: performance-optimizer
- **Realtime issues**: supabase-realtime-optimizer

### Testing
- **Test strategy**: test-engineer
- **Write tests**: testing-specialist
- **E2E tests**: test-engineer

### Domain-Specific
- **Construction workflow**: construction-domain-expert
- **Offline/PWA**: offline-sync-specialist
- **Multi-tenant security**: security-specialist

## Best Practices

### 1. Use the Right Agent
Match the task to the agent's expertise. Don't use fullstack-developer for debugging when debugger is available.

### 2. Provide Context
Give agents clear context about what you need:
```
Good: "Use security-specialist to audit RLS policies for the projects table"
Bad: "Check security"
```

### 3. Let Agents Work
Agents work autonomously through multiple steps. Let them complete before asking for changes.

### 4. Combine Agents
For complex tasks, use multiple agents:
```
1. construction-domain-expert - Review requirements
2. fullstack-developer - Implement feature
3. security-specialist - Audit implementation
4. test-engineer - Create tests
```

### 5. Review Agent Work
Always review what agents produce. They're powerful but not infallible.

## Agent Combinations for Common Tasks

### New Feature Implementation
1. **construction-domain-expert** - Validate requirements
2. **supabase-schema-architect** - Design database
3. **fullstack-developer** - Implement feature
4. **ui-component-generator** - Polish UI
5. **security-specialist** - Security audit
6. **test-engineer** - Create tests

### Performance Issue
1. **debugger** - Identify bottlenecks
2. **performance-optimizer** - Implement fixes
3. **test-engineer** - Add performance tests

### Offline Feature
1. **offline-sync-specialist** - Design sync strategy
2. **react-query-expert** - Implement caching
3. **fullstack-developer** - Build feature
4. **test-engineer** - Test offline scenarios

### Security Audit
1. **security-specialist** - Comprehensive audit
2. **supabase-schema-architect** - Review RLS policies
3. **debugger** - Fix identified issues
4. **test-engineer** - Add security tests

## Configuration

Agents are defined in `.claude/agents/` directory:
```
.claude/agents/
├── debugger.md
├── fullstack-developer.md
├── test-engineer.md
├── testing-specialist.md
├── ui-component-generator.md
├── supabase-schema-architect.md
├── supabase-realtime-optimizer.md
├── offline-sync-specialist.md        ← NEW
├── react-query-expert.md             ← NEW
├── construction-domain-expert.md     ← NEW
├── security-specialist.md            ← NEW
└── performance-optimizer.md          ← NEW
```

Each agent is a markdown file with:
- `name`: Agent identifier
- `description`: When to use it
- `tools`: Available tools (Read, Write, Edit, Bash, Grep)
- `model`: AI model (sonnet, opus, haiku)
- Instructions: Specialized knowledge and approach

## Troubleshooting

### Agent Not Available
- Check `.claude/agents/` directory exists
- Verify agent file is valid markdown with frontmatter
- Restart Claude Code

### Agent Not Working as Expected
- Provide more specific context
- Try breaking task into smaller pieces
- Use a different agent that might be better suited

### Agent Takes Too Long
- Agents handle complex tasks, give them time
- Consider breaking into smaller tasks
- Some agents (like fullstack-developer with opus model) may take longer

## Advanced Usage

### Custom Agents
You can create your own agents by adding files to `.claude/agents/`:

```markdown
---
name: my-custom-agent
description: What this agent does
tools: Read, Write, Edit
model: sonnet
---

Your agent instructions here...
```

### Agent Configuration
Agents can be configured with:
- `tools`: Which tools they can use
- `model`: sonnet (balanced), opus (powerful), haiku (fast)
- Custom instructions and patterns

---

**Pro Tip**: Start with broad requests and let Claude choose the right agent. The "Use PROACTIVELY" agents will be invoked automatically when appropriate!

## Quick Reference

| Task | Agent | Example |
|------|-------|---------|
| Fix bug | debugger | "Debug the 403 error" |
| New feature | fullstack-developer | "Build RFI feature" |
| Create UI | ui-component-generator | "Design form component" |
| Database | supabase-schema-architect | "Design schema" |
| Tests | test-engineer | "Add E2E tests" |
| Security | security-specialist | "Audit RLS policies" |
| Performance | performance-optimizer | "Optimize queries" |
| Offline | offline-sync-specialist | "Add offline support" |
| Data fetching | react-query-expert | "Create React Query hooks" |
| Workflow | construction-domain-expert | "Review RFI process" |
| Realtime | supabase-realtime-optimizer | "Fix subscriptions" |

---

**Last Updated**: 2025-12-04
**Total Agents**: 12 (7 existing + 5 new)
