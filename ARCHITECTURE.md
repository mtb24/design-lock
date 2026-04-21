# Architecture: DesignLock (MCP integration)

## 🏗️ System Overview

This project demonstrates how to constrain LLM-generated UI code using a design system contract that's automatically synchronized from Figma.

```
┌──────────────────────────────────────────────────────────────────┐
│                        FIGMA (Source of Truth)                    │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Tokens     │  │  Components  │  │   Variants   │          │
│  │              │  │              │  │              │          │
│  │ • Colors     │  │ • Button     │  │ • Primary    │          │
│  │ • Spacing    │  │ • Card       │  │ • Danger     │          │
│  │ • Radius     │  │ • TextInput  │  │ • Sizes      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────┬─────────────────────────────────────────────────────┘
             │
             │ Figma Publish Webhook
             ▼
┌──────────────────────────────────────────────────────────────────┐
│                     MCP SERVER (Bridge Layer)                     │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  src/ai/mcp-sync.ts                                        │  │
│  │  ────────────────────                                      │  │
│  │  • Fetch design system from Figma API                      │  │
│  │  • Transform to TypeScript format                          │  │
│  │  • Generate tokens.ts and contracts.ts                     │  │
│  │  • Commit and push changes                                 │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────────┬─────────────────────────────────────────────────────┘
             │
             │ Generates Files
             ▼
┌──────────────────────────────────────────────────────────────────┐
│               DESIGN SYSTEM (Generated Artifacts)                 │
│                                                                   │
│  ┌─────────────────┐         ┌──────────────────┐               │
│  │  tokens.ts      │         │  contracts.ts    │               │
│  │  (generated)    │         │  (generated)     │               │
│  │                 │         │                  │               │
│  │  colors: {...}  │         │  components: {   │               │
│  │  spacing: {...} │         │    Button: {...} │               │
│  │  radius: {...}  │         │    Card: {...}   │               │
│  └─────────────────┘         │  }               │               │
│                              └──────────────────┘               │
└────────┬──────────────────────────┬──────────────────────────────┘
         │                          │
         │ Used by                  │ Used by
         ▼                          ▼
┌──────────────────┐      ┌──────────────────────────────┐
│  UI Components   │      │   AI Validation & Prompting  │
│                  │      │                              │
│  Button.tsx      │      │  validate.ts ✅              │
│  Card.tsx        │      │  prompt.ts 🔮               │
│  TextInput.tsx   │      │  constraints.ts 🔮          │
└──────────────────┘      └────────┬─────────────────────┘
                                   │
                                   │ Validates
                                   ▼
                          ┌──────────────────┐
                          │  AI-Generated    │
                          │  JSX Code        │
                          │                  │
                          │  ✅ PASS or      │
                          │  ❌ FAIL         │
                          └────────┬─────────┘
                                   │
                          If FAIL  │
                                   ▼
                          ┌──────────────────┐
                          │  Auto-Fix        │
                          │  (deterministic) │
                          │                  │
                          │  or Re-prompt    │
                          │  (LLM loop)      │
                          └──────────────────┘
```

---

## 🔑 Key Concepts

### **1. Single Source of Truth**

Figma is the ONLY manual input. Everything else is derived:
- Figma → tokens.ts (auto-generated)
- Figma → contracts.ts (auto-generated)
- contracts.ts → validation rules
- contracts.ts → AI prompts
- contracts.ts → TypeScript types

### **2. Contract as Data, Not Types**

```typescript
// ❌ Traditional approach (types only)
type ButtonProps = { variant: 'primary' | 'danger' }

// ✅ This approach (data + types)
DS_CONTRACT = {
  components: {
    Button: {
      props: {
        variant: { type: 'enum', values: ['primary', 'danger'] }
      }
    }
  }
}
```

**Why better:**
- Can iterate at runtime (validation)
- Can serialize to JSON (AI prompts)
- Can transform programmatically (code generation)
- Types can be derived: `type ButtonVariant = DS_CONTRACT.components.Button.props.variant.values[number]`

### **3. Validation Drives Auto-Fix**

Violations are structured data:
```typescript
{ 
  ok: false,
  violations: [
    "Invalid value for Button.variant: 'premium' (allowed: primary, danger)",
    "Invalid prop: Button.color is not defined in contract"
  ]
}
```

This enables:
- Parse violation → Extract component/prop/value
- Look up correct value in contract
- Apply deterministic fix
- No LLM call needed for simple cases

---

## 📈 Maturity Levels

### **V0 (Current) - Manual Contract**
- Contracts hand-written in TypeScript
- Validation works
- Proves the concept

### **V1 (Next) - AI Prompting**
- Implement `prompt.ts` to embed contract in LLM prompts
- Test with OpenAI/Anthropic/etc.
- Measure constraint adherence rate

### **V2 (Future) - MCP Integration**
- Implement `mcp-sync.ts` to read from Figma MCP server
- Auto-generate contracts on Figma publish
- GitHub Action automates the flow

### **V3 (Production) - Full Loop**
- AST-based validation (`constraints.ts`)
- Multi-tier auto-fix (deterministic + LLM-assisted)
- Real-time validation in development tools
- Metrics and monitoring

---

## 🎤 Interview Talking Points

### **"What's the end-to-end vision?"**

> "Designers work in Figma, which has the design tokens and component definitions. An MCP server reads those changes and auto-generates the TypeScript contract. When AI generates UI code, it's validated against this contract - which is always up-to-date with design. If violations occur, simple deterministic fixes handle common cases, and only complex semantic issues escalate to LLM self-correction or human review."

### **"Why not just use TypeScript types?"**

> "Types vanish at runtime. We need the contract as data to power validation, generate AI prompts, and enable auto-fixing. Plus, deriving from Figma means designers control the constraints, not developers."

### **"What's novel here?"**

> "The combination of MCP for auto-generation, structured contracts for multi-use cases, and validation-driven fixing. Most AI code gen projects either rely on prompting alone or use heavy AST parsing. This is a lightweight, practical middle ground that leverages design tools as the source of truth."

---

## 🔍 Current Status

- ✅ `validate.ts` - Fully implemented (V0.3)
- 🔮 `mcp-sync.ts` - Conceptual sketch (this file)
- 🔮 `prompt.ts` - Empty placeholder
- 🔮 `constraints.ts` - Empty placeholder

**Next Priority:** Implement `prompt.ts` to complete the AI generation loop.

