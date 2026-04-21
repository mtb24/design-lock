# DesignLock

> **Constraining LLM Output to a Design System Contract**

A V0 demo for a YouTube series exploring how to constrain AI-generated UI code to use **only** allowed components, props, and design tokens — moving beyond prompt engineering toward enforceable structure.

---

## ❓ Why This Matters

LLMs are good at generating UI code, but poor at respecting long-lived constraints like design systems, component contracts, and tokens.

This project explores a simple but powerful idea:

> **If you define constraints as data and validate against them, AI output becomes governable — not just impressive.**

---

## 🎯 Project Goals

This project demonstrates a pattern for ensuring AI-generated JSX adheres to a predefined design system:

1. **Single Source of Truth**  
   A design system contract that can be used for:
   - AI prompting
   - Output validation
   - (Future) type generation

2. **Deterministic Components**  
   UI components that use **design tokens only**, not arbitrary values.

3. **Validation Layer**  
   Programmatic verification that generated UI code complies with the contract.

---

## 🏗️ Architecture

### Design System (`src/design-system/`)

- **`tokens.ts`** — Design tokens (colors, spacing, radius, typography)
- **`contracts.ts`** — Component and prop definitions that constrain what AI can output
- **`index.ts`** — Barrel exports for clean imports

### UI Components (`src/ui/`)

All components use token keys for styling. V0 intentionally keeps the surface area small:

- **`Button.tsx`**
  - Variants: `primary`, `danger`
  - Sizes: `sm`, `md`

- **`Card.tsx`**
  - Container component with configurable padding

- **`TextInput.tsx`**
  - Labeled form input with optional `required` state

### AI Validation (`src/ai/`)

- **`validate.ts`**
  - `validateOutput(tsx: string) → { ok, violations }`
  - Validates:
    - Allowed components (`Button`, `Card`, `TextInput`)
    - Allowed props per component
    - Basic structural correctness (V0 uses string/regex checks)

---

## 🚀 Getting Started

```bash
npm install
npm run dev

## Status

This is a V0 foundation. Validation and AI integration are intentionally not implemented yet.