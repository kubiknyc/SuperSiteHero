# /pm:epic-decompose

Break an epic into smaller, more granular, parallelizable tasks.

## Usage
```
/pm:epic-decompose [feature-name]
```

## Process

This command will:

1. **Read the Epic** from `.claude/epics/{feature-name}.md`

2. **Analyze Task Complexity**
   - Identify large tasks that can be split
   - Find opportunities for parallelization
   - Map dependencies

3. **Decompose Tasks**
   - Break large tasks into smaller, atomic units
   - Ensure each task is completable in 2-8 hours
   - Maintain clear ownership
   - Preserve dependencies

4. **Update Epic**
   - Revise task list with finer granularity
   - Update dependency graph
   - Re-estimate effort levels
   - Document decomposition decisions

## Output

Updated epic with refined task breakdown suitable for parallel execution across multiple AI agents.

---

## Decomposing Epic: {feature-name}

I'll break down the epic into finer-grained, parallelizable tasks.

**What I'll do:**
1. Analyze current epic structure
2. Identify decomposition opportunities
3. Create smaller, atomic tasks
4. Map updated dependencies
5. Update effort estimates

Let me start...
