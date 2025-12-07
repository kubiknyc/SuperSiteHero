# /pm:help

Display CCPM command reference and workflow documentation.

## Usage
```
/pm:help
```

---

## CCPM Command Reference

### Setup & Initialization

| Command | Purpose |
|---------|---------|
| `/pm:init` | Initialize CCPM and configure GitHub integration |
| `/pm:help` | Display this command reference |

### PRD & Planning

| Command | Purpose |
|---------|---------|
| `/pm:prd-new [feature]` | Create a comprehensive PRD through guided brainstorming |
| `/pm:prd-parse [feature]` | Transform PRD into technical epic with task breakdown |

### Execution

| Command | Purpose |
|---------|---------|
| `/pm:epic-oneshot [feature]` | Push epic to GitHub as issues and prepare for parallel work |
| `/pm:issue-start [number]` | Start working on a specific GitHub issue |

### Additional Commands

| Command | Purpose |
|---------|---------|
| `/pm:epic-decompose [feature]` | Break epic into smaller, parallelizable tasks |
| `/pm:epic-sync [feature]` | Sync epic changes with GitHub issues |

---

## CCPM Workflow

### Phase 1: Brainstorming
Create a comprehensive PRD through guided discovery and requirements gathering.
```
/pm:prd-new memory-system
```

### Phase 2: Planning
Transform the PRD into a technical epic with explicit task breakdown.
```
/pm:prd-parse memory-system
```

### Phase 3: Execution Setup
Push the epic to GitHub as parallel, independent issues.
```
/pm:epic-oneshot memory-system
```

### Phase 4: Parallel Execution
Launch specialized agents on independent tasks.
```
/pm:issue-start 1
/pm:issue-start 2
```

---

## Key Concepts

**PRD (Product Requirements Document)**
- Comprehensive problem statement
- User stories and use cases
- Requirements and acceptance criteria
- Success metrics

**Epic**
- Technical architecture
- Task breakdown
- Dependencies
- Implementation order

**Issues**
- Atomic, parallelizable tasks
- Clear acceptance criteria
- Linked to epic and PRD
- Ready for AI agent execution

---

## File Structure

```
.claude/
├── prds/          # Product Requirements Documents
│   └── {feature}.md
├── epics/         # Technical Epics
│   └── {feature}.md
├── commands/pm/   # CCPM Commands
└── issues/        # Issue tracking references
```

---

## Getting Started

1. Run `/pm:init` to set up CCPM
2. Create a PRD with `/pm:prd-new [feature-name]`
3. Parse into an epic with `/pm:prd-parse [feature-name]`
4. Push to GitHub with `/pm:epic-oneshot [feature-name]`
5. Start work with `/pm:issue-start [issue-number]`
