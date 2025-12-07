# /pm:prd-parse

Transform a PRD into a technical epic with explicit task breakdown for implementation.

## Usage
```
/pm:prd-parse [feature-name]
```

## Process

This command will:

1. **Read the PRD** from `.claude/prds/{feature-name}.md`

2. **Technical Architecture Planning**
   - Design system architecture
   - Technology decisions with trade-offs
   - Data models
   - API contracts
   - Integration points

3. **Epic Decomposition**
   - Break requirements into technical epics
   - Identify dependencies between tasks
   - Estimate scope and complexity
   - Define clear acceptance criteria

4. **Task Breakdown**
   - Create atomic, parallelizable tasks
   - Assign estimated effort levels (S/M/L/XL)
   - Document technical decisions
   - Include implementation notes

5. **Risk Assessment**
   - Technical risks
   - Mitigation strategies
   - Fallback approaches

## Output

Save the technical epic to `.claude/epics/{feature-name}.md` with:
- Architecture decisions
- Detailed task list with dependencies
- Implementation order for parallel execution
- Testing strategy

---

## Parsing PRD: {feature-name}

I'll analyze the PRD and create a detailed technical epic with task breakdown.

**What I'll do:**
1. Extract key requirements from the PRD
2. Design the technical architecture
3. Break down into atomic, parallel tasks
4. Create implementation order
5. Document all technical decisions

Let me start by reading your PRD...
