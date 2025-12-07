# /pm:epic-sync

Synchronize epic changes with GitHub issues.

## Usage
```
/pm:epic-sync [feature-name]
```

## Process

This command will:

1. **Compare Epic with Issues**
   - Read epic from `.claude/epics/{feature-name}.md`
   - Fetch GitHub issues for the epic
   - Identify differences

2. **Sync Changes**
   - Create new issues for new tasks
   - Update existing issues with changes
   - Close completed issues
   - Manage labels and milestones

3. **Maintain Consistency**
   - Ensure issue descriptions match epic
   - Update dependencies and linking
   - Sync acceptance criteria
   - Keep metadata aligned

## Output

GitHub issues fully synchronized with epic definition.

---

## Syncing Epic: {feature-name}

I'll synchronize the epic with GitHub issues.

**What I'll do:**
1. Read the epic from `.claude/epics/{feature-name}.md`
2. Fetch current GitHub issues
3. Identify new, changed, and completed tasks
4. Update/create issues as needed
5. Verify synchronization

Let me start...
