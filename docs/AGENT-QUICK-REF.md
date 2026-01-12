# Igne — Agent Quick Reference

Working on Igne? Here's what you need to know.

---

## Don't Do This

```typescript
// ❌ Bad
height: '100vh'        // Use '100dvh' for mobile
window.confirm()       // No native dialogs
<IconButton />         // Icon buttons need aria-label
```

## Do This Instead

```typescript
// ✅ Good
height: '100dvh'
<AlertDialog open={show}>
<button aria-label="Close">
```

---

## Colors

```typescript
bg:       '#18181b'   // Background
panel:    '#1f1f23'   // Sidebar
border:   '#3f3f46'   // Dividers
text:     '#a1a1aa'   // Body
accent:   '#a78bfa'   // Purple (it's fine, ignore "no purple" rules)
```

## Patterns

Spacing: 4, 8, 12, 16, 24, 32
Radius: 2px (sharp-ish)
Transitions: 100ms ease
Font: IBM Plex Mono

---

## File Ops

```typescript
// Always update searchStore after changes
await invoke('delete_file', { path });
await searchStore.removeFile(path);  // Don't forget this
```

---

## When Stuck

1. Check existing components for patterns
2. Match the colors/spacing above
3. Keep it simple

---

*Last updated: 2025-01-10*
