/**
 * Model Extensions Patcher for Afterburner
 *
 * Pure AST-level patching for GitHub Copilot CLI model extensions.
 * Requires beautified input (not minified single-line code).
 *
 * Uses meriyah for parsing and astring for code generation.
 */

import { parseModule, parseScript } from 'meriyah';
import { generate } from 'astring';
import type { ESTree } from 'meriyah';
import UglifyJS from 'uglify-js';

// Safe logging helper (avoid TS2584 in deno check)
function logError(...args: unknown[]): void {
  try {
    (
      globalThis as { console?: { error: (...a: unknown[]) => void } }
    ).console?.error(...args);
  } catch {
    /* noop */
  }
}

// Type helper for safely accessing node properties
type NodeProperty =
  | ESTree.Node
  | ESTree.Node[]
  | string
  | number
  | boolean
  | null
  | undefined;
type NodeWithIndex = ESTree.Node & { [key: string]: NodeProperty };

function getNodeProperty(node: ESTree.Node, key: string): NodeProperty {
  return (node as NodeWithIndex)[key];
}

function setNodeProperty(
  node: ESTree.Node,
  key: string,
  value: NodeProperty
): void {
  (node as NodeWithIndex)[key] = value;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface C2Reference {
  c2VarName: string;
  c2VarIndex: number;
}

interface RWeReference {
  rweFuncName: string;
  rweFuncIndex: number;
}

interface FeIResult {
  foundFeIVarName: boolean;
  feIVarName: string | undefined;
}

interface ReactImport {
  index: number;
  reactVarName: string;
}

interface ModelSelectionVars {
  n: string;
  r: string;
  s: string;
  o: string;
  d: string;
  G: string;
}

// ============================================================================
// PATCH 1: C2 Extension Code
// ============================================================================

function findC2Reference(ast: ESTree.Program): C2Reference | null {
  let c2VarIndex = -1;
  let c2VarName: string | null = null;

  for (let i = 0; i < ast.body.length; i++) {
    const node = ast.body[i];
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (
          decl.init?.type === 'ArrayExpression' &&
          decl.init.elements.length >= 2
        ) {
          const elements = decl.init.elements;
          const hasKnownModels = elements.some(
            el =>
              el?.type === 'Literal' &&
              (el.value === 'claude-sonnet-4.5' || el.value === 'gpt-5')
          );
          if (hasKnownModels && decl.id?.type === 'Identifier') {
            c2VarIndex = i;
            c2VarName = decl.id.name;
            break;
          }
        }
      }
      if (c2VarIndex >= 0) break;
    }
  }

  if (c2VarIndex < 0 || !c2VarName) {
    console.error('❌ Could not find C2 array by structure');
    return null;
  }

  console.log(`✅ Found C2 array: ${c2VarName} at index ${c2VarIndex}`);
  return { c2VarName, c2VarIndex };
}

function applyC2ExtensionPatch(ast: ESTree.Program): boolean {
  const c2Ref = findC2Reference(ast);
  if (!c2Ref) return false;

  const { c2VarName, c2VarIndex } = c2Ref;

  function replaceC2References(node: ESTree.Node, actualName: string): void {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'Identifier' && node.name === c2VarName) {
      node.name = actualName;
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range') continue;
      const child = getNodeProperty(node, key);
      if (Array.isArray(child)) {
        child.forEach(c => replaceC2References(c as ESTree.Node, actualName));
      } else if (child && typeof child === 'object') {
        replaceC2References(child as ESTree.Node, actualName);
      }
    }
  }

  const injectionCode = `
try {
    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    if (process.env.COPILOT_MODEL && typeof process.env.COPILOT_MODEL === "string" && !${c2VarName}.includes(process.env.COPILOT_MODEL)) {
        ${c2VarName}.push(process.env.COPILOT_MODEL);
    }
    const cfgPath = path.join(os.homedir(), ".copilot", "config.json");
    if (fs.existsSync(cfgPath)) {
        try {
            const raw = fs.readFileSync(cfgPath, "utf8");
            let cfg = null;
            if (raw && raw.trim().startsWith("{")) {
                cfg = JSON.parse(raw);
            }
            if (cfg && typeof cfg.model === "string" && !${c2VarName}.includes(cfg.model)) {
                ${c2VarName}.push(cfg.model);
            }
        } catch (e) {}
    }
} catch (e) {}
  `;

  const injectionAst = parseScript(injectionCode, {
    next: true,
  }) as ESTree.Program;
  const tryStatement = injectionAst.body[0];

  replaceC2References(tryStatement, c2VarName);
  ast.body.splice(c2VarIndex + 1, 0, tryStatement);

  return true;
}

// ============================================================================
// PATCH 2: Fxe Function Modification
// ============================================================================

function applyFxeFunctionPatch(ast: ESTree.Program): boolean {
  let fxeFuncIndex = -1;
  let fxeFuncName: string | null = null;

  for (let i = 0; i < ast.body.length; i++) {
    const node = ast.body[i];
    if (node.type === 'FunctionDeclaration' && node.params.length === 2) {
      const funcCode = generate(node);
      const hasIdFind = funcCode.includes('.find') && funcCode.includes('.id');
      const hasPolicy = funcCode.includes('.policy');
      const hasDisabled =
        funcCode.includes('"disabled"') || funcCode.includes("'disabled'");

      if (hasIdFind && hasPolicy && hasDisabled) {
        fxeFuncIndex = i;
        fxeFuncName = node.id?.name ?? null;
        break;
      }
    }
  }

  if (fxeFuncIndex < 0 || !fxeFuncName) {
    console.error('❌ Could not find Fxe function by structure');
    return false;
  }

  console.log(`✅ Found Fxe function: ${fxeFuncName} at index ${fxeFuncIndex}`);

  const newFunctionCode = `
function ${fxeFuncName}(t, e) {
    if (!e) return true;
    const l = e.find(I => I.id === t);
    if (!l) return false;
    if (l && l.capabilities && l.capabilities.type === "embeddings") return false;
    return l.policy ? l.policy.state !== "disabled" : true;
}
  `;

  const newFunctionAst = parseScript(newFunctionCode, {
    next: true,
  }) as ESTree.Program;
  const newFunctionNode = newFunctionAst.body[0];

  if (newFunctionNode.type !== 'FunctionDeclaration') {
    console.error('❌ Failed to parse Fxe replacement function');
    return false;
  }

  if (newFunctionNode.id) {
    newFunctionNode.id.name = fxeFuncName;
  }

  const oldNode = ast.body[fxeFuncIndex];
  if (oldNode.type === 'FunctionDeclaration') {
    const oldParams = oldNode.params;
    newFunctionNode.params = oldParams;
  }

  ast.body[fxeFuncIndex] = newFunctionNode;
  return true;
}

// ============================================================================
// PATCH 3: RWe Function Modification
// ============================================================================

function findRWeReference(
  ast: ESTree.Program,
  c2VarName: string
): RWeReference | null {
  let rweFuncIndex = -1;
  let rweFuncName: string | null = null;

  for (let i = 0; i < ast.body.length; i++) {
    const node = ast.body[i];
    if (node.type === 'FunctionDeclaration' && node.params.length === 1) {
      const funcCode = generate(node);
      const hasC2Find = funcCode.includes(`${c2VarName}.find`);
      const hasThrowError =
        funcCode.includes('throw') && funcCode.includes('Error');
      const hasNoSupported =
        funcCode.includes('No supported model') ||
        funcCode.includes('supported model');

      if (hasC2Find && hasThrowError && hasNoSupported) {
        rweFuncIndex = i;
        rweFuncName = node.id?.name ?? null;
        break;
      }
    }
  }

  if (rweFuncIndex < 0 || !rweFuncName) {
    console.error('❌ Could not find RWe function by structure');
    return null;
  }

  console.log(`✅ Found RWe function: ${rweFuncName} at index ${rweFuncIndex}`);
  return { rweFuncName, rweFuncIndex };
}

function applyRWeFunctionPatch(
  ast: ESTree.Program,
  fxeFuncName: string | null
): boolean {
  if (!fxeFuncName) return false;

  const c2Ref = findC2Reference(ast);
  if (!c2Ref) return false;
  const { c2VarName } = c2Ref;

  const rweRef = findRWeReference(ast, c2VarName);
  if (!rweRef) return false;
  const { rweFuncName, rweFuncIndex } = rweRef;

  const newFunctionCode = `
function ${rweFuncName}(t) {
    let e = ${c2VarName}.find(l => ${fxeFuncName}(l, t));
    if (!e && Array.isArray(t)) {
        let srv = t.find(m => ${fxeFuncName}(m.id, t));
        if (srv) e = srv.id;
    }
    if (!e) throw new Error("No supported model available");
    return e;
}
  `;

  const newFunctionAst = parseScript(newFunctionCode, {
    next: true,
  }) as ESTree.Program;
  const newFunctionNode = newFunctionAst.body[0];

  if (newFunctionNode.type !== 'FunctionDeclaration') {
    console.error('❌ Failed to parse RWe replacement function');
    return false;
  }

  if (newFunctionNode.id) {
    newFunctionNode.id.name = rweFuncName;
  }

  const oldNode = ast.body[rweFuncIndex];
  if (oldNode.type === 'FunctionDeclaration') {
    const oldParams = oldNode.params;
    newFunctionNode.params = oldParams;
  }

  ast.body[rweFuncIndex] = newFunctionNode;
  return true;
}

// ============================================================================
// PATCH 4: Schema Changes
// ============================================================================

function findQlReference(ast: ESTree.Program): string | null {
  let qlName: string | null = null;

  function visit(node: ESTree.Node, depth = 0): void {
    if (!node || typeof node !== 'object' || depth > 15 || qlName) return;

    if (
      node.type === 'Property' &&
      ((node.key?.type === 'Identifier' && node.key.name === 'theme') ||
        (node.key?.type === 'Literal' && node.key.value === 'theme'))
    ) {
      if (
        node.value?.type === 'CallExpression' &&
        node.value.callee?.type === 'MemberExpression' &&
        node.value.callee.property?.name === 'optional'
      ) {
        const inner = node.value.callee.object;

        if (
          inner?.type === 'CallExpression' &&
          inner.callee?.type === 'Identifier' &&
          inner.arguments?.length === 0
        ) {
          qlName = inner.callee.name;
          return;
        }
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range') continue;
      const child = getNodeProperty(node, key);
      if (Array.isArray(child)) {
        child.forEach(c => visit(c as ESTree.Node, depth + 1));
      } else if (child && typeof child === 'object') {
        visit(child as ESTree.Node, depth + 1);
      }
    }
  }

  visit(ast);

  if (!qlName) {
    console.error('❌ Could not find Ql via theme property');
    return null;
  }

  console.log(`✅ Found Ql: ${qlName}`);
  return qlName;
}

function applySchemaChangesPatch(
  ast: ESTree.Program,
  c2VarName: string | null
): boolean {
  if (!c2VarName) {
    console.error('patch: schema changes: C2 variable name not provided');
    return false;
  }

  const qlName = findQlReference(ast);
  if (!qlName) return false;

  let patchCount = 0;

  function visit(node: ESTree.Node): void {
    if (!node || typeof node !== 'object') return;

    if (
      node.type === 'CallExpression' &&
      node.callee?.type === 'MemberExpression' &&
      node.callee.property?.name === 'optional' &&
      node.callee.object?.type === 'CallExpression'
    ) {
      const innerCall = node.callee.object;
      if (
        innerCall.type === 'CallExpression' &&
        innerCall.callee?.type === 'Identifier' &&
        innerCall.callee.name.length === 2 &&
        innerCall.arguments?.length === 1 &&
        innerCall.arguments[0]?.type === 'Identifier' &&
        innerCall.arguments[0].name === c2VarName
      ) {
        innerCall.callee.name = qlName;
        innerCall.arguments = [];
        patchCount++;
        console.log(`  Found schema change #${patchCount}`);
      }
    }

    for (const childKey of Object.keys(node)) {
      if (childKey === 'loc' || childKey === 'range') continue;
      const child = getNodeProperty(node, childKey);
      if (Array.isArray(child)) {
        child.forEach(c => visit(c as ESTree.Node));
      } else if (child && typeof child === 'object') {
        visit(child as ESTree.Node);
      }
    }
  }

  visit(ast);

  if (patchCount === 2) {
    console.log(
      `patch: schema changes: Successfully replaced ${patchCount} occurrences`
    );
    return true;
  } else {
    console.error(
      `patch: schema changes: Found ${patchCount} occurrences (expected 2)`
    );
    return false;
  }
}

// ============================================================================
// PATCH 5: Remove Hardcoded FeI Entries
// ============================================================================

function isLabelValueArray(node: ESTree.Node): boolean {
  if (node?.type !== 'ArrayExpression') return false;

  return node.elements.every(
    el =>
      el?.type === 'ObjectExpression' &&
      el.properties.length === 2 &&
      el.properties.every(
        prop =>
          prop.type === 'Property' &&
          ['label', 'value'].includes(
            (prop.key as ESTree.Identifier).name ||
              ((prop.key as ESTree.Literal).value as string)
          ) &&
          prop.value.type === 'Literal' &&
          typeof (prop.value as ESTree.Literal).value === 'string'
      )
  );
}

function applyRemoveFeIEntriesPatch(ast: ESTree.Program): FeIResult {
  for (let i = 0; i < ast.body.length; i++) {
    const node = ast.body[i];
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (
          decl.init?.type === 'ArrayExpression' &&
          isLabelValueArray(decl.init)
        ) {
          if (
            decl.init.elements.length === 3 &&
            decl.id?.type === 'Identifier'
          ) {
            decl.init.elements = [decl.init.elements[0]];
            console.log(
              `✅ Removed hardcoded ${decl.id.name} entries (kept only first)`
            );
            return { foundFeIVarName: true, feIVarName: decl.id.name };
          }
        }
      }
    }
  }

  console.error('patch: removeFeI: Could not find FeI array');
  return { foundFeIVarName: false, feIVarName: undefined };
}

// ============================================================================
// PATCH 6: Model Menu Computation
// ============================================================================

function findReactImportForMenu(ast: ESTree.Program): ReactImport | null {
  for (let i = 0; i < ast.body.length; i++) {
    const node = ast.body[i];

    if (node.type === 'VariableDeclaration') {
      const decl = node.declarations[0];

      if (decl?.init?.type === 'ArrayExpression') {
        const code = generate(node);

        if (
          code.includes('claude-sonnet') &&
          code.includes('label:') &&
          decl.id?.type === 'Identifier'
        ) {
          console.log(
            `✅ Found menu items array at index ${i}: var ${decl.id.name}`
          );

          const prevStatement = ast.body[i - 1];
          if (i > 0 && prevStatement?.type === 'VariableDeclaration') {
            const prevNode = prevStatement;
            const prevDecl = prevNode.declarations[0];
            const prevInit = prevDecl.init;

            if (
              prevInit?.type === 'CallExpression' &&
              prevInit.arguments?.length === 2 &&
              prevInit.arguments[0]?.type === 'CallExpression' &&
              prevInit.arguments[0].arguments?.length === 0 &&
              prevInit.arguments[1]?.type === 'Literal' &&
              prevInit.arguments[1].value === 1 &&
              prevDecl.id?.type === 'Identifier'
            ) {
              const reactVarName = prevDecl.id.name;
              console.log(
                `✅ Found React import at index ${i - 1}: var ${reactVarName}`
              );

              return {
                index: i - 1,
                reactVarName,
              };
            }
          }

          console.error('❌ React import not found before menu array');
          return null;
        }
      }
    }
  }

  console.error('❌ Menu items array not found');
  return null;
}

function findModelSelectionVars(
  ast: ESTree.Program,
  menuArrayName: string
): ModelSelectionVars | null {
  for (let i = 0; i < ast.body.length; i++) {
    const node = ast.body[i];

    if (node.type === 'VariableDeclaration' && node.declarations.length === 2) {
      if (
        node.declarations[0].id?.type === 'Identifier' &&
        node.declarations[0].id.name === menuArrayName
      ) {
        const uiFuncDecl = node.declarations[1];

        if (
          uiFuncDecl.init?.type === 'ArrowFunctionExpression' &&
          uiFuncDecl.init.params[0]?.type === 'ObjectPattern'
        ) {
          const params = uiFuncDecl.init.params[0].properties;

          const modelsParam = params.find(
            p =>
              p.type === 'Property' &&
              p.key?.type === 'Identifier' &&
              p.key.name === 'models'
          );
          if (
            !modelsParam ||
            modelsParam.type !== 'Property' ||
            modelsParam.value.type !== 'Identifier'
          ) {
            console.error('❌ Could not find models parameter');
            return null;
          }

          const n_var = modelsParam.value.name;

          const body =
            uiFuncDecl.init.body.type === 'BlockStatement'
              ? uiFuncDecl.init.body.body
              : [];

          const useStateStmt = body[0];
          if (
            useStateStmt.type !== 'VariableDeclaration' ||
            useStateStmt.declarations[0].id.type !== 'ArrayPattern' ||
            useStateStmt.declarations[0].id.elements[0]?.type !== 'Identifier'
          ) {
            console.error('❌ useState statement not found');
            return null;
          }

          const r_var = useStateStmt.declarations[0].id.elements[0].name;

          const varsStmt = body[2];
          if (
            varsStmt.type !== 'VariableDeclaration' ||
            varsStmt.declarations.length !== 4
          ) {
            console.error('❌ Variables statement not found');
            return null;
          }

          if (
            varsStmt.declarations[0].id.type !== 'Identifier' ||
            varsStmt.declarations[1].id.type !== 'Identifier' ||
            varsStmt.declarations[2].id.type !== 'Identifier' ||
            varsStmt.declarations[3].id.type !== 'Identifier'
          ) {
            console.error('❌ Variable declarators have wrong type');
            return null;
          }

          const s_var = varsStmt.declarations[0].id.name;
          const o_var = varsStmt.declarations[1].id.name;
          const d_var = varsStmt.declarations[2].id.name;
          const G_var = varsStmt.declarations[3].id.name;

          console.log(`✅ Found model selection variables:`);
          console.log(`   n (models param): ${n_var}`);
          console.log(`   r (state var): ${r_var}`);
          console.log(`   s (handler): ${s_var}`);
          console.log(`   o (default model): ${o_var}`);
          console.log(`   d (menu items): ${d_var}`);
          console.log(`   G (cancel option): ${G_var}`);

          return {
            n: n_var,
            r: r_var,
            s: s_var,
            o: o_var,
            d: d_var,
            G: G_var,
          };
        }
      }
    }
  }

  console.error('❌ Could not find model selection UI function');
  return null;
}

function applyModelMenuComputationPatch(
  ast: ESTree.Program,
  c2VarName: string | null,
  menuArrayName: string | undefined,
  fxeFuncName: string | null,
  reactVarName: string
): boolean {
  if (!menuArrayName) return false;

  const vars = findModelSelectionVars(ast, menuArrayName);
  if (!vars) return false;

  const { n, r, s, o, d, G } = vars;

  const menuComputationCode = `(0, ${reactVarName}.useMemo)(() => {
    let baseEntries = [];
    if (Array.isArray(${n}) && ${n}.length > 0) {
      baseEntries = ${n}.map(m => {
        let label = \`\${m.name || m.display_name || m.displayName || m.id} (\${m.id})\`;
        return {
          label: label || m.id,
          value: m.id
        };
      });
    } else if (Array.isArray(${menuArrayName}) && ${menuArrayName}.length > 0) {
      baseEntries = [...${menuArrayName}];
    } else {
      baseEntries = ${c2VarName}.map(id => ({
        label: id,
        value: id
      }));
    }
    let filtered = baseEntries.filter(({value}) => {
      try {
        return ${fxeFuncName}(value, ${n});
      } catch {
        return false;
      }
    });
    return filtered.map(({value, label}) => {
      let lbl = value === ${o} ? \`\${label} (default)\` : label;
      lbl = value === ${r} ? \`\${lbl} (current)\` : lbl;
      return {
        value: value,
        label: lbl
      };
    });
  }, [JSON.stringify(${n} || []), ${r}, ${o}])`;

  const tempAst = parseScript(menuComputationCode) as ESTree.Program;
  const computedMenuItemsInit = (tempAst.body[0] as ESTree.ExpressionStatement)
    .expression;

  function visit(
    node: ESTree.Node,
    parent: ESTree.Node | null,
    key: string | null,
    index: number | null
  ): boolean {
    if (!node || typeof node !== 'object') return false;

    if (node.type === 'VariableDeclaration') {
      const sDecl = node.declarations.find(
        decl =>
          decl.id?.type === 'Identifier' &&
          decl.id.name === s &&
          decl.init?.type === 'ArrowFunctionExpression'
      );
      const oDecl = node.declarations.find(
        decl => decl.id?.type === 'Identifier' && decl.id.name === o
      );
      const dDecl = node.declarations.find(
        decl =>
          decl.id?.type === 'Identifier' &&
          decl.id.name === d &&
          decl.init?.type === 'CallExpression' &&
          decl.init.callee?.type === 'MemberExpression' &&
          decl.init.callee.property?.name === 'map'
      );
      const gDecl = node.declarations.find(
        decl => decl.id?.type === 'Identifier' && decl.id.name === G
      );

      if (sDecl && oDecl && dDecl && gDecl) {
        const computedMenuItemsDecl: ESTree.VariableDeclarator = {
          type: 'VariableDeclarator',
          id: { type: 'Identifier', name: 'computedMenuItems' },
          init: computedMenuItemsInit,
        };

        const newDDecl: ESTree.VariableDeclarator = {
          type: 'VariableDeclarator',
          id: { type: 'Identifier', name: d },
          init: { type: 'Identifier', name: 'computedMenuItems' },
        };

        node.declarations = [sDecl, oDecl, computedMenuItemsDecl];

        if (parent && key && index !== null) {
          const parentValue = getNodeProperty(parent, key);
          if (Array.isArray(parentValue)) {
            const parentArray = parentValue as ESTree.Statement[];
            parentArray.splice(index + 1, 0, {
              type: 'VariableDeclaration',
              kind: 'let',
              declarations: [newDDecl, gDecl],
            });
            console.log(
              '✅ Replaced model menu computation with dynamic version'
            );
            return true;
          }
        }
      }
    }

    for (const childKey of Object.keys(node)) {
      if (childKey === 'loc' || childKey === 'range') continue;
      const child = getNodeProperty(node, childKey);
      if (Array.isArray(child)) {
        for (let i = 0; i < child.length; i++) {
          if (visit(child[i] as ESTree.Node, node, childKey, i)) return true;
        }
      } else if (child && typeof child === 'object') {
        if (visit(child as ESTree.Node, node, childKey, null)) return true;
      }
    }
    return false;
  }

  if (visit(ast, null, null, null)) {
    return true;
  } else {
    console.error('patch: modelMenuComputation: Could not find pattern');
    return false;
  }
}

// ============================================================================
// PATCH 8: Commander Model Option
// ============================================================================

function applyCommanderModelOptionPatch(ast: ESTree.Program): boolean {
  let n6Node: ESTree.NewExpression | null = null;
  let choicesNode: ESTree.CallExpression | null = null;

  const parents = new Map<ESTree.Node, ESTree.Node>();

  function buildParentMap(node: ESTree.Node, parent: ESTree.Node | null): void {
    if (!node || typeof node !== 'object') return;
    if (parent) parents.set(node, parent);

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range') continue;
      const child = getNodeProperty(node, key);
      if (Array.isArray(child)) {
        child.forEach(c => {
          if (c) buildParentMap(c as ESTree.Node, node);
        });
      } else if (child && typeof child === 'object') {
        buildParentMap(child as ESTree.Node, node);
      }
    }
  }

  buildParentMap(ast, null);

  function findN6(node: ESTree.Node): boolean {
    if (!node || typeof node !== 'object') return false;

    if (
      node.type === 'NewExpression' &&
      node.callee &&
      node.arguments &&
      node.arguments[0] &&
      node.arguments[0].type === 'Literal' &&
      node.arguments[0].value === '--model <model>'
    ) {
      n6Node = node;
      return true;
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range') continue;
      const child = getNodeProperty(node, key);
      if (Array.isArray(child)) {
        for (const c of child) {
          if (c && findN6(c as ESTree.Node)) return true;
        }
      } else if (child && typeof child === 'object') {
        if (findN6(child as ESTree.Node)) return true;
      }
    }
    return false;
  }

  findN6(ast);

  if (!n6Node) {
    console.error(
      'patch: commanderModelOption: Could not find N6("--model <model>", ...)'
    );
    return false;
  }

  // TypeScript can't narrow n6Node due to nested function assignment
  // But we know from findN6 logic that it's a NewExpression
  const newExprNode: ESTree.NewExpression = n6Node;

  if (
    newExprNode.arguments[1] &&
    newExprNode.arguments[1].type === 'TemplateLiteral'
  ) {
    newExprNode.arguments[1] = {
      type: 'TemplateLiteral',
      expressions: [],
      quasis: [
        {
          type: 'TemplateElement',
          value: {
            raw: 'Set the AI model to use',
            cooked: 'Set the AI model to use',
          },
          tail: true,
        },
      ],
    };
    console.log('  Simplified --model option description');
  }

  const n6Parent = parents.get(newExprNode);
  console.log('  n6Parent type:', n6Parent?.type);

  if (
    n6Parent &&
    n6Parent.type === 'MemberExpression' &&
    n6Parent.property &&
    n6Parent.property.type === 'Identifier' &&
    n6Parent.property.name === 'choices' &&
    n6Parent.object === newExprNode
  ) {
    console.log('  Found MemberExpression .choices on N6');

    const memberParent = parents.get(n6Parent);
    console.log('  memberParent type:', memberParent?.type);

    if (
      memberParent &&
      memberParent.type === 'CallExpression' &&
      memberParent.callee === n6Parent
    ) {
      choicesNode = memberParent;
      console.log('  Found .choices(C2) CallExpression wrapping N6');

      const choicesParent = parents.get(choicesNode);
      if (choicesParent) {
        for (const key of Object.keys(choicesParent)) {
          if (key === 'loc' || key === 'range') continue;
          const parentValue = getNodeProperty(choicesParent, key);
          if (parentValue === choicesNode) {
            setNodeProperty(choicesParent, key, newExprNode);
            console.log('  Removed .choices(C2) from N6');
            return true;
          } else if (Array.isArray(parentValue)) {
            const idx = parentValue.indexOf(choicesNode as ESTree.Node);
            if (idx !== -1) {
              parentValue[idx] = newExprNode as ESTree.Node;
              console.log('  Removed .choices(C2) from N6');
              return true;
            }
          }
        }
      }
    }
  } else {
    console.log('  Note: No .choices MemberExpression on N6');
  }

  return true;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export function writeModelExtensions(content: string): string | null {
  // 1. Beautify the input first using uglify-js API
  let beautified: string;
  try {
    const res = UglifyJS.minify(content, {
      compress: false,
      mangle: false,
      output: { beautify: true, annotations: true },
    } as unknown as UglifyJS.MinifyOptions);
    if (res.error) {
      logError('patch: modelExtensions: UglifyJS error:', res.error);
      return null;
    }
    beautified = res.code as string;
  } catch (e) {
    logError('patch: modelExtensions: Beautify failed:', e);
    return null;
  }

  // 2. Parse with meriyah
  let ast: ESTree.Program;
  let fxeFuncName: string | null = null;
  try {
    ast = parseModule(beautified, { next: true }) as ESTree.Program;
    console.log('✅ Parsed input code');
    console.log(`   AST body length: ${ast.body.length}\n`);
  } catch (e) {
    logError('patch: modelExtensions: Parse failed:', e);
    return null;
  }

  // 3. Apply patches
  console.log('Applying Patch 1: C2 extension code...');
  if (applyC2ExtensionPatch(ast)) {
    console.log('✅ C2 extension patch applied\n');
  } else {
    console.log('❌ C2 extension patch failed\n');
  }

  console.log('Applying Patch 2: Fxe function modification...');
  for (let i = 0; i < ast.body.length; i++) {
    const node = ast.body[i];
    if (node.type === 'FunctionDeclaration' && node.params.length === 2) {
      const funcCode = generate(node);
      if (
        funcCode.includes('.find') &&
        funcCode.includes('.id') &&
        funcCode.includes('.policy')
      ) {
        fxeFuncName = node.id?.name ?? null;
        break;
      }
    }
  }
  if (applyFxeFunctionPatch(ast)) {
    console.log('✅ Fxe function patch applied\n');
  } else {
    console.log('❌ Fxe function patch failed\n');
  }

  console.log(
    'Applying Patch 3: RWe function modification (fallback logic)...'
  );
  if (applyRWeFunctionPatch(ast, fxeFuncName)) {
    console.log('✅ RWe function patch applied\n');
  } else {
    console.log('❌ RWe function patch failed\n');
  }

  console.log(
    'Applying Patch 4: Schema changes (E2(C2).optional() → Ql().optional())...'
  );
  let c2VarName: string | null = null;
  for (let i = 0; i < ast.body.length; i++) {
    const node = ast.body[i];
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (
          decl.init?.type === 'ArrayExpression' &&
          decl.init.elements?.length >= 2
        ) {
          const hasCanonicalModels = decl.init.elements.some(
            el =>
              (el?.type === 'Literal' &&
                typeof (el as ESTree.Literal).value === 'string' &&
                ((el as ESTree.Literal).value as string).includes('claude')) ||
              (el as ESTree.Literal).value === 'gpt-5'
          );
          if (hasCanonicalModels && decl.id?.type === 'Identifier') {
            c2VarName = decl.id.name;
            break;
          }
        }
      }
      if (c2VarName) break;
    }
  }
  if (applySchemaChangesPatch(ast, c2VarName)) {
    console.log('✅ Schema changes patch applied\n');
  } else {
    console.log('❌ Schema changes patch failed\n');
  }

  console.log('Applying Patch 5: Remove hardcoded FeI entries...');
  const { foundFeIVarName, feIVarName } = applyRemoveFeIEntriesPatch(ast);
  if (foundFeIVarName) {
    console.log('✅ FeI entries patch applied\n');
  } else {
    console.log('❌ FeI entries patch failed\n');
  }

  console.log('Applying Patch 6: Model menu computation...');
  const reactRef = findReactImportForMenu(ast);
  if (!reactRef) {
    console.log('❌ Model menu computation patch failed (no React import)\n');
  } else {
    const { reactVarName } = reactRef;
    if (
      applyModelMenuComputationPatch(
        ast,
        c2VarName,
        feIVarName,
        fxeFuncName,
        reactVarName
      )
    ) {
      console.log('✅ Model menu computation patch applied\n');
    } else {
      console.log('❌ Model menu computation patch failed\n');
    }
  }

  console.log('Applying Patch 8: Commander model option...');
  if (applyCommanderModelOptionPatch(ast)) {
    console.log('✅ Commander model option patch applied\n');
  } else {
    console.log('❌ Commander model option patch failed\n');
  }

  // 4. Generate with astring
  console.log('Generating patched code...');
  try {
    let out = generate(ast);
    // Prepend env node shebang if not present
    if (!out.startsWith('#!')) {
      out = '#!/usr/bin/env node\n' + out;
    }
    return out;
  } catch (e) {
    logError('patch: modelExtensions: Codegen failed:', e);
    return null;
  }
}
