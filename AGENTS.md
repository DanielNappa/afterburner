# Agent Development Rules for Afterburner Model Extensions Patcher

## Core Principle
Pure AST-level patching - **Minimize or eliminate regex usage entirely**

## File Editing Rules

### For EVERY edit to `src/utils/patches/modelExtensions.ts`:
1. **Run type check**: `deno check src/utils/patches/modelExtensions.ts`
   - Ignore errors related to `console` (TS2584)
2. **Run linter**: `bun lint` from tweakcc directory
3. **Use proper tool calls**: Use `str_replace_editor`, NOT echo/cat/heredoc gymnastics

## Testing Process

### Quick Test Cycle
Run the test script for rapid iteration:
```bash
./analyze-ast.mjs
```

This script will:
1. Load vanilla `index-astring.js` (astring-formatted vanilla)
2. Apply all 9 patches using AST transformations
3. Generate `index-patched-astring.js`
4. Diff the result against `index-astring.js` (vanilla)
5. Diff the result against `copilot-astring.js` (ground truth)
6. Display summary of patch application status

### Manual Testing Steps
If you need to test in the real CLI:

1. **Clean and apply patches**:
   ```bash
   rm -rf ~/.afterburner/ && bun dev --debug --apply
   ```

2. **Verify patches against vanilla**:
   ```bash
   diff /home/node/.bun/install/global/node_modules/@github/copilot/index.js index.js
   ```

3. **Compare against ground truth**:
   ```bash
   diff index.js copilot.js
   ```

## Development Approach

### AST Analysis Workflow
1. **Work within `analyze-ast.mjs`** - Single temporary file for testing/analysis
2. **Find functions/variables by name** in the test file first
3. **Analyze their AST structure** to understand what to match
4. **Use that AST pattern** for reliable matching in the actual patcher
5. **Test incrementally** - patch one function at a time
6. **Clean up test files** - Remove or clearly mark for removal after success

### AST Pattern Discovery Process
1. Locate target function/variable by name in analyze-ast.mjs
2. Parse with meriyah to get AST
3. Inspect the AST structure (what nodes, properties, patterns)
4. Create a structural matcher (not name-based) for the patcher
5. Verify matcher works on both beautified and minified code

## Ground Truth

The file `copilot-astring.js` contains the **exact patches needed** (astring-formatted). Run:
```bash
diff index-astring.js copilot-astring.js
```

### Patches Required (in order):
1. **✅ C2 extension code** - Inject after C2 declaration (line ~174491)
2. **✅ Fxe function modification** - Add embeddings filter (line ~174497)
3. **✅ Zx function modification** - Add fallback logic (line ~174503)
4. **✅ Schema changes** - Replace `E2(C2).optional()` with `Ql().optional()` (2 places)
5. **✅ Remove hardcoded FeI entries** - Keep only first entry (line ~189440)
6. **⚠️ Model menu computation** - Replace with dynamic useMemo version (line ~189470) - PARTIAL
7. **⚠️ validateOrAutoFixSelectedModel function** - Add new function (line ~196156) - WRONG LOCATION
8. **✅ Commander model option** - Simplify model description (line ~198532)
9. **✅ Call validateOrAutoFixSelectedModel** - After parsing options (line ~198670)

## File Structure

### Key Files
- `src/utils/patches/modelExtensions.ts` - Main patcher implementation
- `analyze-ast.mjs` - Testing and AST analysis tool
- `index.js` - Vanilla copilot CLI (for comparison)
- `copilot.js` - Ground truth patched version
- `index-astring.js` - Vanilla copilot CLI formatted by astring (for consistent AST comparison)
- `copilot-astring.js` - Ground truth formatted by astring (for consistent AST comparison)
- `index-patched-astring.js` - Patched output from analyze-ast.mjs (temporary)
- `AGENTS.md` - This file (rules for agents)

### Libraries Used
- **meriyah** - Fast, spec-compliant JavaScript parser
- **astring** - ECMAScript code generator from ESTree AST

### Astring Workflow

The astring-formatted files provide consistent formatting for reliable AST-based patching:

1. **Generate astring versions** (already done):
   ```bash
   node -e "const fs=require('fs'),{parse}=require('meriyah'),{generate}=require('astring');const code=fs.readFileSync('index.js','utf-8');const ast=parse(code,{module:true,next:true});fs.writeFileSync('index-astring.js',generate(ast),'utf-8');"
   node -e "const fs=require('fs'),{parse}=require('meriyah'),{generate}=require('astring');const code=fs.readFileSync('copilot.js','utf-8');const ast=parse(code,{module:true,next:true});fs.writeFileSync('copilot-astring.js',generate(ast),'utf-8');"
   ```

2. **Work with astring files** in analyze-ast.mjs:
   - Parse index-astring.js
   - Apply AST-level patches
   - Generate patched output to index-patched-astring.js
   - Diff against copilot-astring.js to verify correctness

## Testing Output Format

The test script outputs:
```
========================================
AFTERBURNER MODEL EXTENSIONS PATCH TEST
========================================

[Step 1] Restoring vanilla index.js...
[Step 2] Running patcher...
[Step 3] Comparing patches against vanilla...
[Step 4] Comparing against ground truth...

========================================
PATCH STATUS SUMMARY
========================================
✅ C2 extension code: SUCCESS
✅ Fxe function modification: SUCCESS
✅ RWe function modification: SUCCESS
✅ Schema changes (2 places): SUCCESS
✅ Remove hardcoded FeI entries: SUCCESS
✅ Model menu computation: SUCCESS
✅ validateOrAutoFixSelectedModel function: SUCCESS
✅ Commander model option: SUCCESS
✅ Call validateOrAutoFixSelectedModel: SUCCESS

Overall: 9/9 patches applied correctly
```

## AST Implementation Details

The patcher uses **meriyah** for parsing and **astring** for code generation. Key insights:

1. **C2 extension**: Inject try-catch block after C2 array declaration
2. **Fxe function**: Replace function body with new implementation checking embeddings
3. **RWe fallback**: Add fallback logic at start of function
4. **Schema changes**: Replace `E2(C2).optional()` with `Ql().optional()` in two places
5. **FeI entries**: Keep only first entry in array
6. **Model menu**: Replace with dynamic `useMemo` computation
7. **validateOrAutoFixSelectedModel**: Insert new async function before main execution
8. **Commander option**: The structure is `new N6(...).choices(C2)` NOT `.addOption(...).choices(C2)`. Must find N6 node, walk up through MemberExpression to CallExpression, then replace in parent.
9. **Call validateOrAutoFixSelectedModel**: Insert after `parseAsync()` call

## Common Pitfalls to Avoid

1. **Don't use regex for code matching** - Use AST structure matching
2. **Don't hardcode identifier names** - Match by structure, not names
3. **Don't assume code is beautified** - AST works on minified code too
4. **Don't skip validation** - Always run deno check and bun lint
5. **Don't create multiple test files** - Use analyze-ast.mjs only
6. **Don't use string manipulation for code generation** - Use astring

## Success Criteria

A patch is successful when:
1. ✅ Type checking passes (`deno check`)
2. ✅ Linting passes (`bun lint`)
3. ✅ Test script shows patch applied
4. ✅ Diff matches ground truth exactly
5. ✅ CLI runs without errors with custom models
