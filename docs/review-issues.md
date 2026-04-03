# Phase 0 Review — Issues Found

**Audited:** `docs/plan/fase-0-scaffolding.md` + `docs/STYLE_GUIDE.md`
**Date:** 2026-04-03
**Status:** ALL ISSUES RESOLVED ✅

---

## Summary

The scaffolding phase is complete. All 23 subtasks are implemented. **All issues have been fixed.**

| Category | Before | After |
|----------|--------|-------|
| Blockers | 1 | 0 |
| Warnings | 4 | 0 |
| Notes | 0 | 0 |

---

## 🔴 Was: Blockers

### 1. bin entries point to `.cjs` but tsup generates `.js` — ✅ FIXED

**Affected files:**
- `packages/acp/package.json`
- `packages/mcp/package.json`
- `packages/cli/package.json`

**Fix applied:** Changed bin entries from `./dist/index.cjs` → `./dist/index.js`

```json
// packages/acp/package.json (after fix)
"bin": { "devagents-acp": "./dist/index.js" }
```

---

## 🟡 Was: Warnings

### 1. vitest.config.ts — Missing workspace mode — ✅ FIXED

**Fix applied:** Created `vitest.workspace.ts` with proper workspace configuration.

```ts
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config'
export default defineWorkspace(['packages/*'])
```

Simplified `vitest.config.ts` to only contain shared config (globals, coverage).

---

### 2. packages/core/package.json — "types" condition unreachable — ✅ FIXED

**Fix applied:** Reordered exports conditions so `types` comes first.

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.mjs",
    "require": "./dist/index.js"
  }
}
```

---

### 3. Root tsconfig.json — Redundant / incomplete — ✅ FIXED

**Fix applied:** Replaced with proper project references to all 4 packages.

```json
{
  "extends": "./tsconfig.base.json",
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/acp" },
    { "path": "./packages/mcp" },
    { "path": "./packages/cli" }
  ]
}
```

---

### 4. packages/core/package.json — No `main`/`module` fields — ✅ ALREADY CORRECT

The file already had `main`, `module`, and `types` fields at lines 4-6. No change needed.

---

## ✅ Verification Results

| Check | Result |
|-------|--------|
| `pnpm install` | ✅ No errors |
| `pnpm build` | ✅ All 4 packages build |
| `pnpm test` | ✅ 4 tests pass |
| `tsc --build` | ✅ All 4 packages compile |
| `npx changeset` | ✅ CLI runs |
| Shebang in binaries | ✅ Present in `dist/index.js` for acp/mcp/cli |
| Git initialized | ✅ Commit exists |
| CLI binaries | ✅ `devagents setup` and `devagents check` work |

---

## Subtask Checklist

| # | Task | Status |
|---|------|--------|
| 0.1.1 | Root `package.json` private + scripts | ✅ |
| 0.1.2 | `pnpm-workspace.yaml` 4 packages | ✅ |
| 0.1.3 | Directory structure | ✅ |
| 0.2.1 | `tsconfig.base.json` ES2022 strict | ✅ |
| 0.2.2 | Per-package tsconfigs with references | ✅ |
| 0.3.1 | `tsup` in devDependencies | ✅ |
| 0.3.2 | `tsup.config.ts` per package | ✅ |
| 0.4.1 | `@devagents/core` package.json | ✅ |
| 0.4.2 | `@devagents/acp` package.json | ✅ Fixed |
| 0.4.3 | `@devagents/mcp` package.json | ✅ Fixed |
| 0.4.4 | `@devagents/cli` package.json | ✅ Fixed |
| 0.5.1 | `vitest` in devDependencies | ✅ |
| 0.5.2 | `vitest.config.ts` + workspace mode | ✅ Fixed |
| 0.5.3 | 4 smoke tests | ✅ |
| 0.6.1 | Changesets configured | ✅ |
| 0.7.1 | `.gitignore` | ✅ |
| 0.7.2 | `.npmrc` | ✅ |
| 0.7.3 | `LICENSE` + `README.md` | ✅ |
| 0.7.4 | Git init + commit | ✅ |
| 0.8.1 | `core/src/index.ts` | ✅ |
| 0.8.2 | `acp/src/index.ts` | ✅ |
| 0.8.3 | `mcp/src/index.ts` | ✅ |
| 0.8.4 | `cli/src/index.ts` | ✅ |

**23/23 subtasks implemented · 23/23 fully correct**

---

## Files Modified

| File | Change |
|------|--------|
| `packages/acp/package.json` | bin `.cjs` → `.js` |
| `packages/mcp/package.json` | bin `.cjs` → `.js` |
| `packages/cli/package.json` | bin `.cjs` → `.js` |
| `packages/core/package.json` | exports types first |
| `vitest.workspace.ts` | Created — workspace mode |
| `vitest.config.ts` | Simplified — shared config only |
| `tsconfig.json` | References all 4 packages |

---

## Ready for Phase 1

Phase 0 is complete. All scaffolding, tooling, and configuration is in place.
