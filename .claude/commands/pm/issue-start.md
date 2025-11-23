# /pm:issue-start

Start working on a specific GitHub issue with full context and task execution.

## Usage
```
/pm:issue-start [issue-number]
```

## Process

This command will:

1. **Load Issue Context**
   - Fetch GitHub issue details
   - Read linked epic and PRD
   - Extract acceptance criteria
   - Load related issues and dependencies

2. **Prepare Environment**
   - Switch to appropriate git worktree
   - Load project context
   - Set up development environment
   - Review blocking dependencies

3. **Execute Task**
   - Break down issue into implementation steps
   - Write code according to specifications
   - Run tests and type checking
   - Create pull request with issue link

4. **Quality Assurance**
   - Verify acceptance criteria met
   - Check code quality and test coverage
   - Document implementation decisions
   - Handle code review feedback

## Output

- Completed implementation
- Pull request linked to issue
- Tests passing
- Code review ready
- Issue marked done

---

## Starting Issue: #{issue-number}

I'll fetch the issue details and begin implementation.

**What I'll do:**
1. Load issue context from GitHub
2. Read linked epic and requirements
3. Prepare development environment
4. Implement according to specifications
5. Create PR and handle review

Let me start by loading the issue...
