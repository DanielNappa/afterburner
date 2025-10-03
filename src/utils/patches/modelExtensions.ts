// Model extensions patch - enables arbitrary AI model selection
// This patch makes the following changes:
// 1. Extends C2 array dynamically from env and config
// 2. Relaxes schema validation (E2(C2) -> Ql())
// 3. Adds embeddings filter to Fxe function
// 4. Adds validateOrAutoFixSelectedModel function
// 5. Removes .choices(C2) from commander option
// 6. Makes model menu dynamic based on server models

import { parseSync } from '@swc/core';
import type { Module, Span } from '@swc/core';
import { LocationResult, ModificationEdit } from './index.js';

// Base type for any SWC AST node, ensuring `type` and `span` are present.
interface Node {
  type: string;
  span: Span;
  [key: string]: unknown;
}

interface ModelExtensionLocations {
  c2Array: LocationResult & { varName: string };
  fxeFunction: LocationResult & { funcName: string };
  rweFunction: LocationResult & { funcName: string };
  schemaModelUse: LocationResult;
  schemaSelectedModelUse: LocationResult;
  feIArray: LocationResult;
  modelMenuComputation: LocationResult;
  commanderModelOption: LocationResult;
}

/**
 * Find all locations needed for model extension patches using SWC AST
 */
function findModelExtensionLocations(
  code: string
): ModelExtensionLocations | null {
  let ast: Module;
  try {
    ast = parseSync(code, {
      syntax: 'ecmascript',
      target: 'es2020',
    });
  } catch (err) {
    console.error('patch: modelExtensions: Failed to parse code', err);
    return null;
  }

  const locations: Partial<ModelExtensionLocations> = {};
  const knownModels = ['claude-sonnet-4.5', 'claude-sonnet-4', 'gpt-5'];

  // Traverse AST to find targets
  function visitNode(node: Node, parent?: Node): void {
    if (!node || typeof node !== 'object') return;

    // 1. Find C2 array by content (VariableDeclarator with ArrayExpression containing known models)
    if (
      !locations.c2Array &&
      node.type === 'VariableDeclarator' &&
      'init' in node &&
      typeof node.init === 'object' &&
      node.init !== null &&
      'type' in node.init &&
      (node.init as Node).type === 'ArrayExpression' &&
      'id' in node &&
      typeof node.id === 'object' &&
      node.id !== null &&
      'type' in node.id &&
      (node.id as Node).type === 'Identifier'
    ) {
      const elements = (node.init as Record<string, unknown>).elements || [];
      const literals = (elements as Array<Record<string, unknown>>)
        .filter(
          (el: Record<string, unknown>) =>
            el?.expression &&
            (el.expression as Record<string, unknown>).type === 'StringLiteral'
        )
        .map(
          (el: Record<string, unknown>) =>
            (el.expression as { value: string }).value
        );

      const matches = literals.filter((lit: string) =>
        knownModels.includes(lit)
      );
      if (
        matches.length >= 2 &&
        (node.id as Record<string, unknown>).type === 'Identifier'
      ) {
        locations.c2Array = {
          startIndex: node.span.start,
          endIndex: node.span.end,
          varName: (node.id as unknown as { value: string }).value,
        };
      }
    }

    // 2. Find Fxe function (2 params, contains .find, .policy, "disabled")
    if (
      !locations.fxeFunction &&
      (node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression') &&
      (node.params as Array<unknown>)?.length === 2
    ) {
      const funcCode = code.slice(
        (node.span as { start: number }).start,
        (node.span as { end: number }).end
      );
      const hasFind = funcCode.includes('.find(');
      const hasPolicy = funcCode.includes('.policy');
      const hasDisabled =
        funcCode.includes('"disabled"') || funcCode.includes("'disabled'");
      const hasIdCheck = funcCode.includes('.id');

      if (hasFind && hasPolicy && hasDisabled && hasIdCheck) {
        let funcName = 'anonymous';
        if (
          parent?.type === 'VariableDeclarator' &&
          (parent.id as Record<string, unknown>)?.type === 'Identifier'
        ) {
          funcName = (parent.id as { value: string }).value;
        } else if (node.type === 'FunctionDeclaration' && node.identifier) {
          funcName = (node.identifier as { value: string }).value;
        }

        locations.fxeFunction = {
          startIndex: (node.span as { start: number }).start,
          endIndex: (node.span as { end: number }).end,
          funcName,
        };
      }
    }

    // 3. Find RWe function (contains C2.find and Fxe call)
    if (
      !locations.rweFunction &&
      locations.c2Array &&
      (node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression')
    ) {
      const funcCode = code.slice(
        (node.span as { start: number }).start,
        (node.span as { end: number }).end
      );
      const hasC2Find = funcCode.includes(`${locations.c2Array.varName}.find(`);
      const hasFxeCall = funcCode.includes('Fxe(');

      if (hasC2Find && hasFxeCall) {
        let funcName = 'anonymous';
        if (
          parent?.type === 'VariableDeclarator' &&
          (parent.id as Record<string, unknown>)?.type === 'Identifier'
        ) {
          funcName = (parent.id as { value: string }).value;
        }

        locations.rweFunction = {
          startIndex: (node.span as { start: number }).start,
          endIndex: (node.span as { end: number }).end,
          funcName,
        };
      }
    }

    // 4. Find schema uses: model: E2(C2).optional() and selectedModel: E2(C2).optional()
    if (
      locations.c2Array &&
      node.type === 'KeyValueProperty' &&
      (node.key as Record<string, unknown>)?.type === 'Identifier' &&
      (node.value as Record<string, unknown>)?.type === 'CallExpression'
    ) {
      const propName = (node.key as { value: string }).value;
      if (
        (propName === 'model' || propName === 'selectedModel') &&
        !locations.schemaModelUse
      ) {
        // Check if value matches E2(C2).optional() pattern
        const valueCode = code.slice(
          ((node.value as Record<string, unknown>).span as { start: number })
            .start,
          ((node.value as Record<string, unknown>).span as { end: number }).end
        );
        if (
          valueCode.includes(locations.c2Array.varName) &&
          valueCode.includes('.optional()')
        ) {
          if (propName === 'model') {
            locations.schemaModelUse = {
              startIndex: (
                (node.value as Record<string, unknown>).span as {
                  start: number;
                }
              ).start,
              endIndex: (
                (node.value as Record<string, unknown>).span as { end: number }
              ).end,
            };
          } else {
            locations.schemaSelectedModelUse = {
              startIndex: (
                (node.value as Record<string, unknown>).span as {
                  start: number;
                }
              ).start,
              endIndex: (
                (node.value as Record<string, unknown>).span as { end: number }
              ).end,
            };
          }
        }
      }
    }

    // 5. Find FeI array (menu items array with label/value pairs)
    if (
      !locations.feIArray &&
      node.type === 'VariableDeclarator' &&
      (node.init as Record<string, unknown>)?.type === 'ArrayExpression' &&
      (node.id as Record<string, unknown>)?.type === 'Identifier'
    ) {
      const elements =
        ((node.init as Record<string, unknown>).elements as Array<
          Record<string, unknown>
        >) || [];
      if (elements.length > 0) {
        const firstEl = elements[0]?.expression as Record<string, unknown>;
        if (firstEl?.type === 'ObjectExpression') {
          const props =
            (firstEl.properties as Array<Record<string, unknown>>) || [];
          const hasLabel = props.some(
            (p: Record<string, unknown>) =>
              (p.key as { value: string })?.value === 'label'
          );
          const hasValue = props.some(
            (p: Record<string, unknown>) =>
              (p.key as { value: string })?.value === 'value'
          );

          if (hasLabel && hasValue) {
            const objCode = code.slice(
              (firstEl.span as { start: number }).start,
              (firstEl.span as { end: number }).end
            );
            if (
              objCode.includes('Claude') ||
              objCode.includes('claude-sonnet')
            ) {
              locations.feIArray = {
                startIndex: (node.span as { start: number }).start,
                endIndex: (node.span as { end: number }).end,
              };
            }
          }
        }
      }
    }

    // 6. Find model menu computation (FeI.filter pattern or useMemo)
    if (
      !locations.modelMenuComputation &&
      locations.feIArray &&
      node.type === 'VariableDeclarator'
    ) {
      const initCode = node.init
        ? code.slice(
            ((node.init as Record<string, unknown>).span as { start: number })
              .start,
            ((node.init as Record<string, unknown>).span as { end: number }).end
          )
        : '';
      if (initCode.includes('FeI.filter') && initCode.includes('Fxe')) {
        locations.modelMenuComputation = {
          startIndex: (node.span as { start: number }).start,
          endIndex: (node.span as { end: number }).end,
        };
      }
    }

    // 7. Find commander --model option (.choices(C2) pattern)
    if (
      !locations.commanderModelOption &&
      locations.c2Array &&
      node.type === 'CallExpression' &&
      (node.callee as Record<string, unknown>)?.type === 'MemberExpression'
    ) {
      const callCode = code.slice(
        (node.span as { start: number }).start,
        (node.span as { end: number }).end
      );
      if (
        callCode.includes('--model') &&
        callCode.includes('.choices(') &&
        callCode.includes(locations.c2Array.varName)
      ) {
        locations.commanderModelOption = {
          startIndex: (node.span as { start: number }).start,
          endIndex: (node.span as { end: number }).end,
        };
      }
    }

    // Recursively traverse
    for (const key in node) {
      if (key === 'span' || key === 'type') continue;
      const child = node[key];

      if (Array.isArray(child)) {
        child.forEach(c => visitNode(c as Node, node));
      } else if (child && typeof child === 'object') {
        visitNode(child as Node, node);
      }
    }
  }

  // Start traversal - cast Module body to Node for traversal
  if ('body' in ast && Array.isArray(ast.body)) {
    ast.body.forEach((item: unknown) => visitNode(item as Node));
  }

  // Validate we found critical pieces
  if (!locations.c2Array) {
    console.error('patch: modelExtensions: Could not find C2 array');
    return null;
  }

  if (!locations.fxeFunction) {
    console.error('patch: modelExtensions: Could not find Fxe function');
    return null;
  }

  if (!locations.schemaModelUse) {
    console.error('patch: modelExtensions: Could not find schema model usage');
    return null;
  }

  return locations as ModelExtensionLocations;
}

/**
 * Apply all model extension patches
 */
export function writeModelExtensions(oldFile: string): string | null {
  const locations = findModelExtensionLocations(oldFile);
  if (!locations) {
    return null;
  }

  const edits: ModificationEdit[] = [];

  // 1. Inject C2 dynamic extension after C2 array declaration
  const c2ExtensionCode = `

try {
    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    if (process.env.COPILOT_MODEL && typeof process.env.COPILOT_MODEL === "string" && !${locations.c2Array.varName}.includes(process.env.COPILOT_MODEL)) {
        ${locations.c2Array.varName}.push(process.env.COPILOT_MODEL);
    }
    const cfgPath = path.join(os.homedir(), ".copilot", "config.json");
    if (fs.existsSync(cfgPath)) {
        try {
            const raw = fs.readFileSync(cfgPath, "utf8");
            let cfg = null;
            if (raw && raw.trim().startsWith("{")) {
                cfg = JSON.parse(raw);
            }
            if (cfg && typeof cfg.model === "string" && !${locations.c2Array.varName}.includes(cfg.model)) {
                ${locations.c2Array.varName}.push(cfg.model);
            }
        } catch (e) {}
    }
} catch (e) {}
`;

  edits.push({
    startIndex: locations.c2Array.endIndex,
    endIndex: locations.c2Array.endIndex,
    newContent: c2ExtensionCode,
  });

  // 2. Replace Fxe function with embeddings filter
  const fxeCode = oldFile.slice(
    locations.fxeFunction.startIndex,
    locations.fxeFunction.endIndex
  );
  const fxeFuncStart = fxeCode.indexOf('{');
  const fxeBodyStart = locations.fxeFunction.startIndex + fxeFuncStart + 1;

  const embeddingsCheck = `
    if (!e) return true;
    const l = e.find(I => I.id === t);
    if (!l) return false;
    if (l && l.capabilities && l.capabilities.type === "embeddings") return false;
    return l.policy ? l.policy.state !== "disabled" : true;
`;

  // Find the end of first statement to replace
  const fxeBodyEnd = locations.fxeFunction.endIndex - 1; // Before closing brace

  edits.push({
    startIndex: fxeBodyStart,
    endIndex: fxeBodyEnd,
    newContent: embeddingsCheck,
  });

  // 3. Enhance RWe function to check server models
  if (locations.rweFunction) {
    const rweCode = oldFile.slice(
      locations.rweFunction.startIndex,
      locations.rweFunction.endIndex
    );
    // Find position after "let e = C2.find(..." line
    const findLineMatch = rweCode.match(
      /let\s+(\w+)\s*=\s*\w+\.find\([^)]+\);/
    );
    if (findLineMatch) {
      const insertPos =
        locations.rweFunction.startIndex +
        (findLineMatch.index || 0) +
        findLineMatch[0].length;
      const serverFallback = `
    if (!${findLineMatch[1]} && Array.isArray(t)) {
        let srv = t.find(m => Fxe(m.id, t));
        if (srv) ${findLineMatch[1]} = srv.id;
    }`;

      edits.push({
        startIndex: insertPos,
        endIndex: insertPos,
        newContent: serverFallback,
      });
    }
  }

  // 4. Replace schema model: E2(C2).optional() -> Ql().optional()
  if (locations.schemaModelUse) {
    edits.push({
      startIndex: locations.schemaModelUse.startIndex,
      endIndex: locations.schemaModelUse.endIndex,
      newContent: 'Ql().optional()',
    });
  }

  // 5. Replace schema selectedModel: E2(C2).optional() -> Ql().optional()
  if (locations.schemaSelectedModelUse) {
    edits.push({
      startIndex: locations.schemaSelectedModelUse.startIndex,
      endIndex: locations.schemaSelectedModelUse.endIndex,
      newContent: 'Ql().optional()',
    });
  }

  // 6. Trim FeI array to just first entry
  if (locations.feIArray) {
    const feICode = oldFile.slice(
      locations.feIArray.startIndex,
      locations.feIArray.endIndex
    );
    const arrayStart = feICode.indexOf('[');
    const firstObjMatch = feICode.match(
      /\{\s*label:\s*"[^"]+",\s*value:\s*"[^"]+"\s*\}/
    );

    if (firstObjMatch && arrayStart !== -1) {
      const newFeI =
        feICode.slice(0, arrayStart + 1) + ' ' + firstObjMatch[0] + ' ]';
      const varNameMatch = feICode.match(/var\s+(\w+)\s*=/);
      const fullReplacement = varNameMatch
        ? `var ${varNameMatch[1]} = ${newFeI.slice(arrayStart)}`
        : newFeI;

      edits.push({
        startIndex: locations.feIArray.startIndex,
        endIndex: locations.feIArray.endIndex,
        newContent: fullReplacement,
      });
    }
  }

  // 7. Replace model menu computation with dynamic useMemo version
  if (locations.modelMenuComputation) {
    const computedMenuCode = `computedMenuItems = (0, uy.useMemo)(() => {
        let baseEntries = [];
        if (Array.isArray(n) && n.length > 0) {
            baseEntries = n.map(m => {
                let label = m.name || m.display_name || m.displayName || m.id;
                return {
                    label: label || m.id,
                    value: m.id
                };
            });
        } else if (Array.isArray(FeI) && FeI.length > 0) {
            baseEntries = [ ...FeI ];
        } else {
            baseEntries = ${locations.c2Array.varName}.map(id => ({
                label: id,
                value: id
            }));
        }
        let filtered = baseEntries.filter(({
            value
        }) => {
            try {
                return Fxe(value, n);
            } catch {
                return false;
            }
        });
        return filtered.map(({
            value,
            label
        }) => {
            let lbl = value === o ? \`\${label} (default)\` : label;
            lbl = value === r ? \`\${lbl} (current)\` : lbl;
            return {
                value: value,
                label: lbl
            };
        });
    }, [ JSON.stringify(n || []), r, o ]);
    let d = computedMenuItems`;

    // Find variable name from original
    const origCode = oldFile.slice(
      locations.modelMenuComputation.startIndex,
      locations.modelMenuComputation.endIndex
    );
    const varMatch = origCode.match(/(\w+)\s*=/);
    if (varMatch) {
      edits.push({
        startIndex: locations.modelMenuComputation.startIndex,
        endIndex: locations.modelMenuComputation.endIndex,
        newContent: computedMenuCode,
      });
    }
  }

  // 8. Remove .choices(C2) from commander option
  if (locations.commanderModelOption) {
    const optCode = oldFile.slice(
      locations.commanderModelOption.startIndex,
      locations.commanderModelOption.endIndex
    );
    const newOptCode = optCode
      .replace(
        /`Set the AI model to use \(\$\{[^}]+\.join\([^)]+\)\}\)`/,
        '`Set the AI model to use`'
      )
      .replace(/\.choices\([^)]+\)/, '');

    edits.push({
      startIndex: locations.commanderModelOption.startIndex,
      endIndex: locations.commanderModelOption.endIndex,
      newContent: newOptCode,
    });
  }

  // Apply edits in reverse order to preserve indices
  edits.sort((a, b) => b.startIndex - a.startIndex);

  let newFile = oldFile;
  for (const edit of edits) {
    newFile =
      newFile.slice(0, edit.startIndex) +
      edit.newContent +
      newFile.slice(edit.endIndex);
  }

  // 9. Add validateOrAutoFixSelectedModel function (append near end, before parseAsync call)
  const validateFunctionCode = `

async function validateOrAutoFixSelectedModel(selectedModel) {
    if (!selectedModel) return;
    let serverModels = [];
    try {
        serverModels = await qTe(T, e?.getCurrentSessionId?.() ?? null, It?.authInfo ?? null, Gm) || [];
    } catch {
        serverModels = [];
    }
    const visibleServerIds = Array.isArray(serverModels) ? serverModels.filter(m => {
        try {
            return Fxe(m.id, serverModels);
        } catch {
            return false;
        }
    }).map(m => m.id).filter(Boolean) : [];
    const merged = Array.from(new Set([ ...Array.isArray(${locations.c2Array.varName}) ? ${locations.c2Array.varName} : [], ...visibleServerIds ]));
    if (merged.includes(selectedModel)) return;
    let replacement = null;
    try {
        replacement = RWe(serverModels);
    } catch {
        replacement = Array.isArray(${locations.c2Array.varName}) && ${locations.c2Array.varName}.length > 0 ? ${locations.c2Array.varName}[0] : null;
    }
    if (!replacement) {
        process.stderr.write("warning: Model '" + selectedModel + "' not available and no fallback found. Continuing without change.\\n");
        return;
    }
    process.stderr.write("warning: Model '" + selectedModel + "' is not available. Switching to '" + replacement + "'.\\n");
    try {
        if (typeof zr !== "undefined" && zr?.load && zr?.write) {
            let cfg = await zr.load() || {};
            cfg.model = replacement;
            await zr.write(cfg);
        } else {
            process.env.COPILOT_MODEL = replacement;
        }
    } catch {
        process.env.COPILOT_MODEL = replacement;
    }
}
`;

  // Find "await cTt.parseAsync();" or similar parse call
  const parseAsyncMatch = newFile.match(/await\s+\w+\.parseAsync\([^)]*\);/);
  if (parseAsyncMatch && parseAsyncMatch.index !== undefined) {
    const insertPos = parseAsyncMatch.index;
    newFile =
      newFile.slice(0, insertPos) +
      validateFunctionCode +
      '\n\n' +
      newFile.slice(insertPos);

    // Also add call after parseAsync
    const parseEndPos =
      insertPos + validateFunctionCode.length + 2 + parseAsyncMatch[0].length;
    const validateCallCode = `

const parsedOptions = cTt.opts ? cTt.opts() : {};

await validateOrAutoFixSelectedModel(parsedOptions.model);
`;
    newFile =
      newFile.slice(0, parseEndPos) +
      validateCallCode +
      newFile.slice(parseEndPos);
  }

  return newFile;
}
