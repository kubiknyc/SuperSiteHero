# /pm:epic-oneshot

Push epic tasks to GitHub as issues and prepare for parallel execution.

## Usage
```
/pm:epic-oneshot [feature-name]
```

## Process

This command will:

1. **Read the Epic** from `.claude/epics/{feature-name}.md`

2. **Create GitHub Issues**
   - Generate issues from task breakdown
   - Set up proper labels (epic, task, frontend, backend, testing, etc.)
   - Link dependent issues
   - Configure milestones

3. **Prepare for Execution**
   - Create git worktrees for parallelizable tasks
   - Document worktree structure
   - Set up branch naming conventions
   - Generate issue branch references

4. **Track Progress**
   - Create progress dashboard reference
   - Set up issue templates
   - Document PR linking strategy

## Output

- GitHub issues created from tasks
- Worktree structure ready for parallel agents
- Issue tracking configured
- Team can immediately start parallel work

---

## Pushing Epic: {feature-name}

I'll create GitHub issues from the technical epic and set up for parallel execution.

**What I'll do:**
1. Read the epic task breakdown
2. Create GitHub issues for each task
3. Set up proper labels and dependencies
4. Create git worktrees for parallel work
5. Document the execution plan

Let me start...
