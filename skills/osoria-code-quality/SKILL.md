---
name: osoria-code-quality
description: >
  Enforces project code quality standards for OsorIa-Ecomerce TypeScript/React code.
  Trigger: When writing, refactoring, or reviewing application code in this project, especially UI, editor, renderer, model, and state files.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- When changing React/Next/TypeScript application code in this repository
- When refactoring large files or mixed-responsibility modules
- When adding new renderer, editor, state, or model logic
- When reviewing whether code is maintainable enough to keep growing safely

## Critical Patterns

### 1. Strong typing first
- Prefer explicit domain types over `any`, implicit object shapes, and loose records.
- Keep normalization/clamping helpers typed and colocated with their domain model.
- UI handlers may accept raw strings, but conversion/clamping must happen in typed helpers.

### 2. Modular architecture over giant files
- Split by responsibility: renderer, editor controls, state helpers, model normalization, constants.
- Avoid components that mix view rendering, domain normalization, interaction state, and configuration tables in one file.
- If a file becomes hard to scan, extract helpers/components before adding more behavior.

### 3. SOLID where it fits
- **S**ingle Responsibility: one module should have one clear reason to change.
- **O**pen/Closed: extend with new config/types/helpers instead of branching giant conditionals everywhere.
- **L/I**: keep interfaces focused and avoid bloated component props.
- **D**ependency direction: UI depends on domain helpers, not the other way around.

### 4. DRY with intention
- Reuse typed helpers/constants for repeated options, clamping, transforms, labels, and defaults.
- Do not duplicate option arrays, magic numbers, or repeated object-shape logic across editor and renderer.
- Extract common JSX only when it improves clarity; avoid fake abstractions that hide intent.

### 5. Small, maintainable files
- Prefer small files with obvious names.
- Separate constants, types, helpers, and components when a file starts carrying multiple mental models.
- Default heuristic: if a file feels “scroll-heavy”, it probably needs extraction.

### 6. Readable code over clever code
- Use descriptive names that explain intent, not implementation accidents.
- Prefer guard clauses and small helpers over deeply nested conditionals.
- Keep JSX readable: derive classes/data before returning markup when the expression gets noisy.

### 7. Constants and types separated
- Keep reusable option lists, limits, presets, and domain types outside view components.
- UI copy can stay near the component when it is truly local, but domain constants belong in typed modules.

### 8. UI composition rules
- Renderer code should not own editor-only decisions unless needed for compatibility.
- Editor code should consume domain helpers instead of re-implementing business rules.
- Interactive overlays (tooltips/popovers/hotspots) must be tested for runtime layering, pointer behavior, and keyboard access.

### 9. Refactor safely
- Preserve backward compatibility in saved payloads unless a migration is explicitly planned.
- Add or update focused tests before/while refactoring behavior.
- Prefer additive changes to domain models and normalize legacy data centrally.

## Decision Guide

| Problem | Preferred move | Avoid |
|---|---|---|
| Repeated option arrays/limits | Extract typed constants | Copy/paste between files |
| Big component with many branches | Split into focused subcomponents/helpers | Keep adding conditionals |
| Raw values from inputs | Clamp/normalize in domain helpers | Inline parsing everywhere |
| Renderer + editor duplicate logic | Share domain helpers | Re-derive rules twice |
| UI-specific floating behavior | Use existing Radix/shadcn primitives when possible | Hand-rolled state if primitive fits |

## Code Examples

### Good: typed domain helper

```ts
export const HERO_OFFSET = { min: -16, max: 16, default: 0 } as const

export function clampHeroOffset(value: unknown, fallback = HERO_OFFSET.default) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(Math.max(numeric, HERO_OFFSET.min), HERO_OFFSET.max)
}
```

### Good: component delegates to helper

```ts
onChange={(event) =>
  handleHeroSlideChange("contentOffsetX", clampHeroOffset(event.target.value))
}
```

### Good: extract repeated UI sections

```tsx
<HeroBackgroundControls
  model={heroLayerModel}
  slide={activeHeroSlide}
  onChange={handleHeroSlideChange}
  onModelChange={handleInputChange}
/>
```

## Commands

```bash
pnpm test tests/components/hero-banner.test.tsx tests/components/editor-panel.test.tsx
pnpm exec eslint components/sections/hero-banner.tsx components/admin/editor-panel.tsx lib/hero/hero-layer-model.ts --max-warnings=0
pnpm typecheck
```

## Resources

- **Documentation**: See [AGENTS.md](../../AGENTS.md) for project-level usage and registration.
