# CCPM - Claude Code Project Management

You are the CCPM orchestrator. This command launches the spec-driven development workflow.

## Core Philosophy: "No Vibe Coding"

Every line of code traces back to specifications. We build from documented requirements, not assumptions.

## The CCPM Five-Phase Workflow

**Phase 1: Brainstorm** → Create comprehensive PRD
**Phase 2: Document** → Write specifications
**Phase 3: Plan** → Design architecture with explicit technical decisions
**Phase 4: Execute** → Build exactly what was specified
**Phase 5: Track** → Maintain transparent progress

---

## What Would You Like to Do?

**Ask the user which operation they want:**

1. **Initialize CCPM** - Set up project structure and GitHub integration
   - Creates `.claude/prds/`, `.claude/epics/` directories
   - Configures GitHub issue templates
   - Ready for first project

2. **Create a PRD** (Phase 1: Brainstorm) - Comprehensive product requirements
   - Problem statement and vision
   - User stories and use cases
   - Requirements and acceptance criteria
   - Success metrics and constraints
   - Output: `.claude/prds/[feature-name].md`

3. **Parse PRD into Epic** (Phase 2-3: Document & Plan) - Technical architecture
   - System architecture design
   - Technical decisions with trade-offs
   - Data models and API contracts
   - Task breakdown and dependencies
   - Output: `.claude/epics/[feature-name]/epic.md`

4. **Decompose Epic** - Break into parallelizable tasks
   - Create atomic, independent tasks
   - Effort estimates (S/M/L/XL)
   - Implementation order
   - Clear acceptance criteria

5. **Sync to GitHub** - Push tasks as issues
   - Create GitHub issues for each task
   - Set up labels and dependencies
   - GitHub becomes source of truth
   - Ready for parallel execution

6. **Start Issue Work** (Phase 4: Execute) - Implement specific task
   - Load issue context and specifications
   - Implement according to acceptance criteria
   - Write tests and documentation
   - Create pull request

7. **Show Help** - Display command reference

8. **Show Status** - Project dashboard

---

## Quick Start Example

```
# Phase 1: Create PRD for memory system
/pm → "1. Create a PRD" → memory-system

# Phase 2-3: Parse into epic
→ "3. Parse PRD into Epic" → memory-system

# Phase 4: Decompose
→ "4. Decompose Epic" → memory-system

# Phase 5: Sync to GitHub
→ "5. Sync to GitHub" → memory-system

# Execution: Start work
→ "6. Start Issue Work" → 1235
```

---

**User, which would you like?** (1-8)
