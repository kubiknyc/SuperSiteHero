# React Optimization Quick Reference

## TL;DR - When to Optimize

| Situation | Solution | File Example |
|-----------|----------|--------------|
| Expensive calculation runs on every render | `useMemo` | `ProjectsPage.tsx` line 51-62 |
| Event handler passed to child component | `useCallback` | `ProjectsPage.tsx` line 65-67 |
| Helper function inside component | Move outside | `ProjectsPage.tsx` line 21-42 |
| Constant object/array inside component | Move outside | `DailyReportsCalendar.tsx` line 25-30 |
| List item component | `React.memo` | `StatCard.tsx` line 30 |
| setTimeout/setInterval | Cleanup in `useEffect` return | `NotificationCenter.tsx` line 181-185 |

## Copy-Paste Patterns

### 1. Filter with useMemo
```typescript
// ✅ Good - Only filters when dependencies change
const filteredItems = useMemo(() => {
  if (!items) return []
  if (!searchQuery) return items

  const query = searchQuery.toLowerCase()
  return items.filter(item =>
    item.name.toLowerCase().includes(query)
  )
}, [items, searchQuery])

// ❌ Bad - Filters on EVERY render
const filteredItems = items?.filter(item =>
  item.name.toLowerCase().includes(searchQuery.toLowerCase())
)
```

### 2. Event Handler with useCallback
```typescript
// ✅ Good - Stable reference
const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  setSearchQuery(e.target.value)
}, []) // Empty deps because we only use setState

<Input onChange={handleChange} />

// ❌ Bad - New function every render
<Input onChange={(e) => setSearchQuery(e.target.value)} />
```

### 3. Helper Functions Outside Component
```typescript
// ✅ Good - Created once
const getStatusVariant = (status: string) => {
  switch (status) {
    case 'active': return 'success'
    case 'inactive': return 'secondary'
    default: return 'default'
  }
}

function Component() {
  return <Badge variant={getStatusVariant(status)} />
}

// ❌ Bad - New function every render
function Component() {
  const getStatusVariant = (status: string) => {
    // ... same code
  }
  return <Badge variant={getStatusVariant(status)} />
}
```

### 4. Constant Data Outside Component
```typescript
// ✅ Good - Created once
const STATUS_COLORS = {
  active: 'green',
  inactive: 'gray'
}

function Component() {
  return <div style={{ color: STATUS_COLORS[status] }} />
}

// ❌ Bad - New object every render
function Component() {
  const statusColors = {
    active: 'green',
    inactive: 'gray'
  }
  return <div style={{ color: statusColors[status] }} />
}
```

### 5. List Item with React.memo
```typescript
// ✅ Good - Only re-renders when props change
interface ItemProps {
  item: Item
  onEdit: (item: Item) => void
  onDelete: (id: string) => void
}

const ListItem = memo<ItemProps>(function ListItem({ item, onEdit, onDelete }) {
  return (
    <Card>
      <Button onClick={() => onEdit(item)}>Edit</Button>
      <Button onClick={() => onDelete(item.id)}>Delete</Button>
    </Card>
  )
})

// Parent component
function List() {
  const handleEdit = useCallback((item: Item) => {
    // edit logic
  }, [])

  const handleDelete = useCallback((id: string) => {
    // delete logic
  }, [])

  return items.map(item => (
    <ListItem
      key={item.id}
      item={item}
      onEdit={handleEdit}  // ✓ Stable reference
      onDelete={handleDelete}  // ✓ Stable reference
    />
  ))
}

// ❌ Bad - Recreates functions, defeats memo purpose
function List() {
  return items.map(item => (
    <ListItem
      item={item}
      onEdit={(item) => { /* logic */ }}  // ✗ New function each render
      onDelete={(id) => { /* logic */ }}  // ✗ New function each render
    />
  ))
}
```

### 6. Timer Cleanup
```typescript
// ✅ Good - Proper cleanup
useEffect(() => {
  const interval = setInterval(() => {
    updateData()
  }, 5000)

  return () => {
    clearInterval(interval)  // ✓ Cleanup on unmount
  }
}, [updateData])

// ✅ Good - With refs for complex scenarios
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

useEffect(() => {
  intervalRef.current = setInterval(() => {
    updateData()
  }, 5000)

  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)  // ✓ Cleanup
      intervalRef.current = null
    }
  }
}, [updateData])

// ❌ Bad - Memory leak!
useEffect(() => {
  setInterval(() => {
    updateData()
  }, 5000)
  // ✗ No cleanup - timer keeps running after unmount
}, [updateData])
```

## Decision Tree

```
Is this inside a component function?
├─ Yes: Is it constant data (objects, arrays, configs)?
│  ├─ Yes → Move outside component
│  └─ No → Continue
│
├─ Is it a calculation based on props/state?
│  ├─ Yes: Is it expensive (loops, filters, complex math)?
│  │  ├─ Yes → Use useMemo
│  │  └─ No → Leave as is (premature optimization)
│  └─ No → Continue
│
├─ Is it a function passed as a prop to a child?
│  ├─ Yes: Does the child use memo or could benefit from it?
│  │  ├─ Yes → Use useCallback
│  │  └─ No → Consider if child will be optimized later
│  └─ No → Continue
│
├─ Is it a component rendered in a list?
│  ├─ Yes: Does it have expensive rendering logic?
│  │  ├─ Yes → Wrap in React.memo
│  │  └─ No → Test first, optimize if needed
│  └─ No → Continue
│
└─ Does it use setTimeout/setInterval?
   ├─ Yes → Add cleanup in useEffect return
   └─ No → You're done!
```

## Common Mistakes to Avoid

### Mistake 1: Memoizing Everything
```typescript
// ❌ Over-optimization
const name = useMemo(() => user.firstName + ' ' + user.lastName, [user])
const isActive = useMemo(() => status === 'active', [status])
const className = useMemo(() => `card ${variant}`, [variant])

// ✅ These are cheap - don't memoize
const name = user.firstName + ' ' + user.lastName
const isActive = status === 'active'
const className = `card ${variant}`
```

### Mistake 2: Wrong Dependencies
```typescript
// ❌ Missing dependencies
const handleClick = useCallback(() => {
  console.log(currentValue) // Uses currentValue but not in deps!
}, [])

// ✅ Correct dependencies
const handleClick = useCallback(() => {
  console.log(currentValue)
}, [currentValue])

// ✅ Or use setState callback form (no deps needed)
const handleClick = useCallback(() => {
  setValue(prev => prev + 1)
}, [])
```

### Mistake 3: Inline Objects in Dependencies
```typescript
// ❌ Bad - Creates new object every render
const data = useMemo(() => processData(items), [
  { filter: searchQuery } // ✗ New object each render!
])

// ✅ Good - Primitive dependencies
const data = useMemo(() => processData(items), [
  searchQuery // ✓ Primitive value
])
```

### Mistake 4: Forgetting to Memoize Callbacks for Memoized Components
```typescript
// ❌ Bad - defeats the purpose of memo
const ListItem = memo(({ item, onEdit }) => <Card />)

function List() {
  return items.map(item => (
    <ListItem
      item={item}
      onEdit={() => edit(item)} // ✗ New function - memo doesn't help!
    />
  ))
}

// ✅ Good - stable callbacks
const ListItem = memo(({ item, onEdit }) => <Card />)

function List() {
  const handleEdit = useCallback((item) => edit(item), [])

  return items.map(item => (
    <ListItem
      item={item}
      onEdit={handleEdit} // ✓ Same function - memo works!
    />
  ))
}
```

## Cheat Sheet

### When to use useMemo
- ✅ Filtering/sorting large arrays (100+ items)
- ✅ Complex calculations (nested loops, recursive functions)
- ✅ Expensive object transformations
- ❌ Simple calculations (concatenation, basic math)
- ❌ Objects that change every render anyway

### When to use useCallback
- ✅ Functions passed to memoized children
- ✅ Functions used in useEffect dependencies
- ✅ Functions passed to context providers
- ❌ Event handlers for DOM elements (onClick, onChange)
- ❌ Functions only used within the component

### When to use React.memo
- ✅ Components rendered in lists/grids
- ✅ Components with expensive render logic
- ✅ Components that receive same props often
- ❌ Components that change frequently anyway
- ❌ Simple components (just text/icons)

### When to move outside component
- ✅ Constants (colors, configs, mappings)
- ✅ Pure utility functions
- ✅ Type definitions
- ✅ Validation schemas
- ❌ Functions that need props/state
- ❌ Hooks (must stay inside)

## Testing Your Optimizations

### React DevTools Profiler
```bash
1. Open Chrome DevTools
2. Go to "Profiler" tab
3. Click record (⏺)
4. Interact with your component
5. Stop recording
6. Check "Ranked" view for slow components
7. Click component to see why it rendered
```

### Manual Testing Checklist
- [ ] Component renders correctly
- [ ] State updates work as expected
- [ ] Event handlers fire correctly
- [ ] No errors in console
- [ ] Memory usage stable (DevTools Memory tab)
- [ ] Fewer re-renders in Profiler
- [ ] Props comparison working (React DevTools)

## Files to Reference

| File | What to Learn |
|------|---------------|
| `src/pages/projects/ProjectsPage.optimized.tsx` | Complete page optimization |
| `src/features/daily-reports/components/DailyReportsCalendar.optimized.tsx` | useCallback examples |
| `src/pages/dashboard/components/StatCard.tsx` | React.memo component |
| `src/components/NotificationCenter.tsx` | Timer cleanup |
| `src/pages/daily-reports/DailyReportsPage.tsx` | Already well-optimized! |

## Quick Commands

```bash
# Check for optimization opportunities
npm run lint

# Test after optimization
npm run test
npm run test:e2e
npm run type-check

# Analyze bundle
npm run analyze

# Performance testing
npm run perf:all
```

## Remember

1. **Profile before optimizing** - Don't guess, measure
2. **Start with high-traffic components** - Biggest impact
3. **Move constants out first** - Easiest wins
4. **Test thoroughly** - Optimizations can introduce bugs
5. **Document your changes** - Help future developers

## When in Doubt

Ask yourself:
1. Is this actually slow? (profile it!)
2. Will this component be used in a list?
3. Does the child component use memo?
4. Are there alternative solutions (virtualization, pagination)?

If unsure, **start simple** and optimize only when you have evidence it's needed.
