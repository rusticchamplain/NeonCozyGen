# Future Structure Plan (Non-Technical Edition)

=============================
 THE COZYGEN CLOSET CLEANOUT
=============================

## Quick Story
We have a fantastic studio full of tools, props, and special effects. Right now, some of those tools are stored in multiple places. That makes it harder to find what you need, and sometimes the same tool gets rebuilt twice.

This plan is a tidy-up. We are not changing the show, the script, or the actors. We are simply putting the gear in the right labeled bins so the crew can move faster.

## The Big Goal (In Plain Language)
- Keep the experience exactly the same for users.
- Make the codebase easier to navigate for engineers.
- Eliminate duplicate tools that do the same job.

## Why This Matters
- Faster new feature work.
- Fewer bugs from "almost the same" logic living in two places.
- Less risk when a key workflow changes.

## The North Star (Source of Truth)
PromptComposer is the "gold standard" UI experience. Any shared modules we create should match its behavior and feel.

---

## The Plan, Told As A Short Journey

### Act 1: Map The Studio
We identify the places where the same logic is repeated:
- Tag browsing exists both in PromptComposer and in the tag library UI.
- Alias selection exists both in PromptComposer and in StringInput.
- Some preset utilities appear to be legacy compared to the server-backed workflow presets.

### Act 2: Build The Shared Props
We create shared modules that live in one place and are used everywhere:
- A single Tag Library panel, based on PromptComposer.
- A single Alias Picker panel, based on PromptComposer.

### Act 3: Replace The Duplicates
We keep the UI and behavior identical, but the underlying logic is now shared:
- TagLibrarySheet uses the shared Tag Library panel.
- StringInput uses the shared Alias Picker panel.

---

## The New Map (Human Friendly)
Think of it like this:

- APP CORE: The "front door" to the studio.
- FEATURES: The big areas of the app (Studio, Gallery, Composer, Tags, Aliases, Login).
- SHARED: The tools everyone uses (buttons, inputs, hooks, utilities).
- SHARED-DOMAIN: The specialty props that should exist only once (tag library, alias picker).

A tidy target structure looks like:

```
js/src/
  app/            # App shell, routing
  features/       # Major areas (Studio, Gallery, Composer, Tags, Aliases, Login)
  shared/         # Shared UI, hooks, utilities
  shared-domain/  # Tag library + alias picker (PromptComposer-quality)
  styles/         # Global styles
  config/         # Configuration data (ex: LoRA pairs)
```

---

## What Stays Exactly The Same
- All user-facing behavior.
- All API endpoints.
- ComfyUI entrypoints (`__init__.py`, `nodes.py`) remain at repo root.

---

## Engineer Handoff (The Concrete Steps)
This is the practical checklist for engineers:

1) Extract PromptComposer tag browsing into a shared panel
   - Place in `shared-domain/tagLibrary/`.
   - Keep same filters, search, pagination, and "selected tags" UX.

2) Extract PromptComposer alias picker into a shared panel
   - Place in `shared-domain/aliasPicker/`.
   - Keep category/subcategory filtering and token insertion.

3) Update TagLibrarySheet to use the shared tag panel
   - Keep existing props (`initialQuery`, `inline`, `onSelectTag`).

4) Update StringInput to use the shared alias picker panel
   - Ensure token insertion + weights match PromptComposer.

5) Evaluate and remove legacy utilities if unused
   - `js/src/utils/presets.js` appears to be a legacy local cache.

---

## Risks (And How We Avoid Them)
- Risk: UI looks slightly different.
  - Fix: Reuse the same CSS classnames and layout tokens.

- Risk: Tag selection behavior differs between screens.
  - Fix: Treat PromptComposer as the canonical behavior.

- Risk: Extra churn.
  - Fix: Do this in small, reversible steps.

---

## Validation (What To Check)
- Tag library search, filter, and infinite scroll.
- Alias picking, token insertion, and token strength.
- Render flow remains unchanged.
- No regression in presets.

---

## Final Note For Leadership
This is not a rewrite. It is a clean, low-risk organization pass that makes the team faster and safer. The output is a tidier, more durable foundation for future work.

