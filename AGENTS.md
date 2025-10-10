# Agent Development Rules for Tweak GC Model Extensions Patcher

## Core Principle
Pure AST-level patching - **Attempts to be 100% identifier-agnostic using structural pattern matching**

**IMPORTANT**: The patcher automatically beautifies input using UglifyJS before applying patches, then generates output with astring. No manual beautification needed.

## File Editing Rules

### For EVERY edit to `src/utils/patches/modelExtensions.ts`:
1. **Run type check**: `/home/node/.deno/bin/deno check src/utils/patches/modelExtensions.ts`
   - Only console errors (TS2584) are acceptable
   - **NO `any` or `unknown` types allowed**
   - **NO `@ts-ignore` comments allowed**
   - Use proper ESTree types with `NodeWithIndex` helper for dynamic property access
2. **Run linter**: `bun lint` from tweakgc directory - must pass
3. **Use proper tool calls**: Use `str_replace_editor`, NOT echo/cat/heredoc/temp files
4. **Use `node -e` for testing**: Never create temporary files for AST exploration

## Testing Process

### Quick Test Cycle (Development)
For rapid iteration during development, you can test the patcher logic locally using `node -e`. These test files are NOT in git:

```bash
# First-time setup: Generate astring-formatted version from your local CLI installation
# (Only needed once or when testing new CLI versions)
node -e "const fs=require('fs'),{parse}=require('meriyah'),{generate}=require('astring');const code=fs.readFileSync('node_modules/@github/copilot/index.js','utf-8');const ast=parse(code,{module:true,next:true});fs.writeFileSync('index-astring.js',generate(ast),'utf-8');"
```

To validate the patcher logic:
1. Generate vanilla `index-astring.js` (astring-formatted from CLI)
2. Test patches using `node -e` for AST exploration and verification
3. Compare results against expected patterns

**Note**: All test files and scripts are local development tools and are not committed to the repository. They're used to validate the patcher logic before integrating into the production code at `src/utils/patches/modelExtensions.ts`.

### Real CLI Testing
Test the actual patcher integration:

1. **Clean and apply patches**:
   ```bash
   rm -rf ~/.tweakgc/ && bun dev --debug --apply
   ```

2. **Test with custom model**:
   ```bash
   /home/node/.bun/install/global/node_modules/@github/copilot/bin/copilot --model custom-model-id
   ```

3. **Verify patched CLI works**:
   - CLI should start without errors
   - Custom models should be available in model selection
   - Model menu should show server models dynamically

## Development Approach

### AST Pattern Discovery Workflow
When adding new patches or fingerprinting variables:

1. **Use `node -e` for exploration** (never create temp files):
   ```bash
   node -e "const {parseScript}=require('meriyah'); const code='...'; console.log(JSON.stringify(parseScript(code).body[0], null, 2));"
   ```

2. **Find structural patterns, not names**:
   - Analyze AST shape: node types, nesting, relationships
   - Identify unique structural characteristics
   - Create matchers based on structure, not identifier names

3. **Test across CLI versions**:
   ```bash
   # Generate astring versions for testing if needed
   node -e "const fs=require('fs'),{parse}=require('meriyah'),{generate}=require('astring');const code=fs.readFileSync('node_modules/@github/copilot/index.js','utf-8');const ast=parse(code,{module:true,next:true});fs.writeFileSync('index-astring.js',generate(ast),'utf-8');"
   # Then test your patterns with node -e
   node -e "const {parseScript}=require('meriyah');const fs=require('fs');const code=fs.readFileSync('index-astring.js','utf-8');const ast=parseScript(code);console.log(JSON.stringify(ast.body.find(...), null, 2));"
   ```

4. **Implement in patcher**:
   - Add finder function to `src/utils/patches/modelExtensions.ts`
   - Use returned identifier names in injection templates with `${varName}`
   - Test with real CLI using `bun dev --debug --apply`

5. **Validate**:
   - Run `deno check` (only TS2584 errors allowed)
   - Run `bun lint` (must pass)
   - Test with real CLI

### Identifier-Agnostic Pattern Matching
All finders use structural patterns, never hardcoded names:

- **C2 (models array)**: Array declaration with string literals matching `/^[a-z0-9-]+$/`
- **Fxe (model filter)**: Function with embeddings capability check
- **RWe (fallback)**: Function calling C2.find() with model parameter
- **FeI (menu items)**: Array of objects with label/value shape
- **React variable**: Import pattern with `(require(...), 1)`
- **N6 (Commander)**: NewExpression with `"--model <model>"` literal
- **Ql (enum function)**: CallExpression wrapping empty call inside `.optional()`
- **Commander parse location**: Ternary with `.opts ? .opts() : {}`
- **Menu context variables (n, r, o, s, d, G)**: Structural position within arrow functions and declarations

## Ground Truth

The file `copilot-astring.js` contains the **exact patches needed** (astring-formatted). Run:
```bash
diff index-astring.js copilot-astring.js
```

### Patches Applied (7 total):
1. **✅ C2 extension code** - Inject try-catch after C2 array declaration
2. **✅ Fxe function modification** - Add embeddings capability filter
3. **✅ RWe function modification** - Add Array.isArray(serverModels) fallback
4. **✅ Schema changes** - Replace `E2(C2).optional()` with `Ql().optional()` (2 occurrences)
5. **✅ Remove hardcoded FeI entries** - Keep only first entry
6. **✅ Model menu computation** - Replace static filter with dynamic useMemo
7. **✅ Commander model option** - Simplify description, remove `.choices(C2)`

**Note**: The validateOrAutoFixSelectedModel function and its call were removed as they are not needed for the patcher to work correctly.

## File Structure

### Repository Files (Tracked in Git)
- `src/utils/patches/modelExtensions.ts` - **Production patcher** (TypeScript, fully typed)
- `AGENTS.md` - This file (development rules and guidelines)

### Local Development Files (Not in Git)
These files can be created locally for development and validation but are not committed to the repository:

- `index-astring.js` - Vanilla CLI (astring-formatted, generated via `node -e` from installed CLI)
- Any test scripts or validation tools created for local development

These are temporary development aids. Use `node -e` for AST exploration and testing.

### System Files
- `node_modules/@github/copilot/index.js` - Installed CLI (any version, for cross-version testing)

### Libraries Used
- **meriyah** - Fast, spec-compliant JavaScript parser
- **astring** - ECMAScript code generator from ESTree AST

### Astring Workflow (Local Development Only)

The production patcher in `src/utils/patches/modelExtensions.ts` automatically handles beautification using UglifyJS and code generation using astring. 

For local AST testing and validation, you can optionally create an astring-formatted reference file:

**Generate astring version** (optional, for testing only):
```bash
node -e "const fs=require('fs'),{parse}=require('meriyah'),{generate}=require('astring');const code=fs.readFileSync('node_modules/@github/copilot/index.js','utf-8');const ast=parse(code,{module:true,next:true});fs.writeFileSync('index-astring.js',generate(ast),'utf-8');"
```

This generates a consistently formatted AST output useful for:
- Exploring AST structure with `node -e`
- Testing patch patterns
- Validating finder functions across CLI versions

**Important**: These test files are for local development only and are not committed to git. The production patcher works directly on any CLI version without requiring pre-formatted files.

## Testing Output Format

When testing the production patcher with `bun dev --debug --apply`, you'll see patch application status in the console output. Each patch reports success or failure with descriptive messages about what was found and modified.

## AST Implementation Details

The patcher uses **meriyah** for parsing, and **astring** for code generation.

### Patch Implementation Patterns

1. **C2 extension**: 
   - Find: Array declaration with model ID string literals
   - Inject: Try-catch block reading from env vars and config file
   - Position: Immediately after C2 array declaration

2. **Fxe function**:
   - Find: Function with capability check pattern
   - Replace: Function body with embeddings type filter
   - Key: Reuse discovered identifier names for parameters

3. **RWe fallback**:
   - Find: Function calling C2.find() with model parameter
   - Inject: Fallback logic checking Array.isArray before find
   - Position: After initial find, before error throw

4. **Schema changes** (2 occurrences):
   - Find: CallExpression with `.optional()` wrapping `E2(C2)`
   - Replace: Inner call from `E2(C2)` to `Ql()` with no args
   - Remove: C2 argument from enum call

5. **FeI entries**:
   - Find: Array of objects with label/value structure
   - Replace: Keep only `[0]` (first entry)
   - Remove: All hardcoded model menu entries

6. **Model menu**:
   - Find: Variable declarations with arrow function and FeI filter chain
   - Replace: Static filter with dynamic useMemo using React variable
   - Inject: `computedMenuItems` variable with server models logic

7. **Commander option**:
   - Find: `new N6("--model <model>", ...)` with potential `.choices(C2)` wrapper
   - Simplify: Template literal description to plain string
   - Remove: `.choices(C2)` call if present (walk parent tree)

8. **validateOrAutoFixSelectedModel**:
   - Status: **REMOVED** - Not needed for functionality
   - CLI works without this validation function

## Common Pitfalls to Avoid

1. **❌ Don't use regex for code matching** - Use AST structural pattern matching
2. **❌ Don't hardcode identifier names** - Match by structure, discover names at runtime
3. **❌ Don't assume specific minified names** - Patch must work across CLI versions
4. **❌ Don't use `any` or `unknown` types** - Use proper ESTree types with `NodeWithIndex`
5. **❌ Don't use `@ts-ignore`** - Fix type errors properly with type assertions
6. **❌ Don't create temp files** - Use `node -e` for testing
7. **❌ Don't skip validation** - Always run `deno check` and `bun lint`
8. **❌ Don't use string manipulation** - Use astring for code generation
9. **❌ Don't use `cat`/`echo`/heredoc** - Use `str_replace_editor` for file edits

## Success Criteria

A patch is successful when:
1. ✅ Type checking passes (`/home/node/.deno/bin/deno check src/utils/patches/modelExtensions.ts`)
   - Only TS2584 console errors allowed
2. ✅ Linting passes (`bun lint`)
3. ✅ Test script shows all patches applied (`./analyze-ast copy.mjs`)
4. ✅ Diff matches ground truth (`copilot-astring.js`)
5. ✅ Works across CLI versions 
6. ✅ Real CLI runs without errors
7. ✅ Custom models visible in model selection menu
8. ✅ Server models loaded dynamically in menu

## Type Safety Guidelines

### Proper TypeScript Patterns

**✅ CORRECT - Using NodeWithIndex helper:**
```typescript
type NodeProperty = ESTree.Node | ESTree.Node[] | string | number | boolean | null | undefined;
type NodeWithIndex = ESTree.Node & { [key: string]: NodeProperty };

function getNodeProperty(node: ESTree.Node, key: string): NodeProperty {
  return (node as NodeWithIndex)[key];
}
```

**❌ WRONG - Using any/unknown:**
```typescript
const child = (node as any)[key];  // ❌ NO
const child = (node as unknown as Record<string, unknown>)[key];  // ❌ NO
```

**✅ CORRECT - Type narrowing with checks:**
```typescript
if (!n6Node || n6Node.type !== "NewExpression") {
  return false;
}
const newExprNode: ESTree.NewExpression = n6Node;
```

**❌ WRONG - Using @ts-ignore:**
```typescript
// @ts-ignore - ❌ NEVER DO THIS
const args = node.arguments;
```

### Handling ESTree Union Types

ESTree.Node is a discriminated union. TypeScript can't narrow types modified in nested functions:

**✅ CORRECT - Explicit type after null check:**
```typescript
let node: ESTree.NewExpression | null = null;

function find(ast: ESTree.Node): boolean {
  if (ast.type === "NewExpression") {
    node = ast;
    return true;
  }
  return false;
}

find(ast);
if (!node) return false;
// TypeScript sees node as 'never' here due to nested assignment
const typedNode: ESTree.NewExpression = node;  // ✅ Explicit type
```

**❌ WRONG - Expecting automatic narrowing:**
```typescript
if (!node || node.type !== "NewExpression") return false;
// ❌ TypeScript still sees node as 'never'
node.arguments[0]  // ❌ Error: Property 'arguments' does not exist on type 'never'
```
