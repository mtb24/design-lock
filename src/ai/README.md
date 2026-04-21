# AI Integration Layer

This folder contains the AI constraint and validation logic for ensuring LLM-generated UI code conforms to the design system contract.

## 📁 Files

### ✅ Implemented (V0.3)

**`validate.ts`** - Runtime validation of AI-generated JSX
- Validates component names against allowed list
- Validates props against contract definitions
- Validates enum values (variant, size, padding, etc.)
- Validates token references
- Returns structured violations for auto-fixing or display

### 🔮 Future Implementation

**`mcp-sync.ts`** - Figma → Design System synchronization
- Fetches design tokens and components from Figma via MCP server
- Transforms Figma data into `tokens.ts` and `contracts.ts`
- Runs automatically on Figma publishes (via webhook/GitHub Action)
- Keeps design system contract in sync with design truth

**`prompt.ts`** - AI prompt generation (V1)
- Embeds DS_CONTRACT into LLM prompts
- Formats contract for different LLM providers
- Includes few-shot examples
- Handles token injection for context

**`constraints.ts`** - Advanced constraint logic (V1)
- AST-based validation (vs current regex)
- Composable constraint rules
- Context-aware validation
- Nested component handling

---

## 🔄 The Complete Loop (Production)

```
┌─────────────┐
│   Figma     │ Designer publishes changes
└──────┬──────┘
       │
       │ Webhook triggers GitHub Action
       │
┌──────▼──────────────┐
│  MCP Server         │ Reads Figma API
│  (mcp-sync.ts)      │ Transforms to contracts
└──────┬──────────────┘
       │
       │ Commits generated files
       │
┌──────▼──────────────┐
│  Design System      │
│  tokens.ts (gen)    │ ← Auto-updated
│  contracts.ts (gen) │ ← Auto-updated
└──────┬──────────────┘
       │
       │ Used by validation
       │
┌──────▼──────────────┐
│  AI Generation      │
│  (prompt.ts)        │ Embeds contract in prompt
└──────┬──────────────┘
       │
       │ LLM generates JSX
       │
┌──────▼──────────────┐
│  Validation         │
│  (validate.ts)      │ Checks against contract
└──────┬──────────────┘
       │
       │ If violations found
       │
┌──────▼──────────────┐
│  Auto-Fix           │ Deterministic repairs
│  (or re-prompt)     │ or LLM self-correction
└─────────────────────┘
```

---

## 🎯 Key Insights

### **Why MCP Integration Matters**

Without MCP:
- ❌ Manual updates to tokens/contracts
- ❌ Design-code drift over time
- ❌ AI validates against stale contracts
- ❌ Weeks to propagate design changes

With MCP:
- ✅ Automatic updates from Figma
- ✅ Always in sync (single source of truth)
- ✅ AI validates against latest design system
- ✅ Minutes to propagate design changes

### **The Contract as Bridge**

The `DS_CONTRACT` object is the linchpin:

1. **Figma (source)** → MCP generates contract
2. **AI Prompts** → Contract embedded for constraints
3. **Validation** → Contract defines rules
4. **Auto-fix** → Contract defines allowed values
5. **TypeScript** → Contract generates types
6. **Documentation** → Contract powers Storybook

**One data structure, six use cases.**

---

## 🛠️ Setup (When Implementing)

### Prerequisites
```bash
# Install MCP client (conceptual)
npm install @modelcontextprotocol/client

# Configure Figma access
echo "FIGMA_ACCESS_TOKEN=your-token" > .env
echo "FIGMA_FILE_ID=your-file-id" >> .env
```

### Run Sync
```bash
# Test sync (dry run)
npm run sync-figma -- --dry-run

# Sync and commit
npm run sync-figma

# Auto-sync via GitHub Action
# See: .github/workflows/sync-figma-design-system.yml
```

---

## 📚 Resources

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Figma REST API](https://www.figma.com/developers/api)
- [Design Tokens Format](https://tr.designtokens.org/format/)
- [Component Metadata Standard](https://component-metadata.dev/)

---

## 🎬 Demo Script (For Interview)

1. **Show manual V0**: "Right now contracts are hand-coded"
2. **Show mcp-sync.ts**: "In production, this script reads Figma"
3. **Show workflow**: "GitHub Action runs on every Figma publish"
4. **Show the flow**: "Designer updates Figma → MCP syncs → AI validates against new rules"
5. **The punchline**: "Zero developer intervention for design system updates"

