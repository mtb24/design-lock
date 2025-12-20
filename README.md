# AI Design System Experiment

> **Constraining LLM Output to a Design System Contract**

A V0 demo for a YouTube series exploring how to constrain AI-generated UI code to only use allowed components, props, and design tokens.

## 🎯 Project Goals

This project demonstrates a pattern for ensuring AI-generated JSX adheres to a predefined design system:

1. **Single Source of Truth**: Define a design system contract that works for both AI prompting and validation
2. **Deterministic Components**: UI components that only use design tokens (no arbitrary values)
3. **Validation Layer**: Programmatically verify AI output against the contract

## 🏗️ Architecture

### Design System (`src/design-system/`)

- **`tokens.ts`** - Design tokens (colors, spacing, radius, typography)
- **`contracts.ts`** - Component/prop definitions that constrain what AI can output
- **`index.ts`** - Barrel exports for clean imports

### UI Components (`src/ui/`)

All components use only token keys for styling:

- **`Button.tsx`** - Variants: `primary`, `secondary`, `danger` | Sizes: `sm`, `md`, `lg`
- **`Card.tsx`** - Container with configurable padding
- **`TextInput.tsx`** - Form inputs with labels and validation states

### AI Validation (`src/ai/`)

- **`validate.ts`** - `validateOutput(tsx: string)` returns `{ ok, violations, warnings }`
  - Validates allowed components (Button, Card, TextInput)
  - Validates allowed props per component
  - Validates token references

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Visit the demo
open http://localhost:3000/ai-ui-demo
```

## 📍 Demo Route: `/ai-ui-demo`

The demo page showcases:
- Login card built with design system components
- Design system contract JSON viewer
- (Future) Interactive validator for testing AI output

## 🧪 Design System Contract

The `DS_CONTRACT` object defines:

```typescript
{
  components: {
    Button: { props: { variant, size, children, onClick } },
    Card: { props: { padding, children } },
    TextInput: { props: { label, placeholder, required, type } }
  },
  tokens: {
    colors: [...],
    spacing: [...],
    radius: [...],
    fontSize: [...],
    fontWeight: [...]
  },
  rules: [
    "Only use components listed in the contract",
    "Only use props defined for each component",
    "Use only token keys for styling",
    // ...
  ]
}
```

This contract can be:
1. Sent to an LLM as part of the prompt
2. Used to validate LLM output
3. Used to generate TypeScript types

## 🎬 YouTube Series Roadmap

- [x] **V0**: Basic design system + contract + validation
- [ ] **V1**: AI prompting with contract injection
- [ ] **V2**: Real-time validation UI
- [ ] **V3**: AST-based validation (vs regex)
- [ ] **V4**: Token usage enforcement
- [ ] **V5**: Dynamic contract extension

## 🛠️ Tech Stack

- **TanStack Router** - File-based routing with auto-generated route tree
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **No CSS frameworks** - Inline styles using design tokens

## 📝 Key Principles

1. **No Magic Values**: All styling uses token keys, never hardcoded values
2. **Contract as Data**: The design system contract is a plain object, not just types
3. **Simple Validation**: V0 uses string/regex validation (AST parsing in future versions)
4. **Minimal Dependencies**: Keep the core pattern simple and portable

## 🧰 Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Preview production build
npm run preview
```

## 📂 Project Structure

```
src/
├── ai/                    # AI validation logic
│   ├── validate.ts        # Output validation
│   ├── constraints.ts     # (Future) Constraint definitions
│   └── prompt.ts          # (Future) Prompt generation
├── design-system/         # Design system source of truth
│   ├── tokens.ts          # Design tokens
│   ├── contracts.ts       # Component contracts
│   └── index.ts           # Barrel exports
├── ui/                    # UI components (use tokens only)
│   ├── Button.tsx
│   ├── Card.tsx
│   └── TextInput.tsx
└── routes/
    └── ai-ui-demo.tsx     # Demo route
```

## 🤝 Contributing

This is an experimental project for educational purposes. Feel free to explore, fork, and experiment!

## 📄 License

MIT

---

**Author**: Ken Downey  
**Purpose**: YouTube series on constraining AI output to design systems
