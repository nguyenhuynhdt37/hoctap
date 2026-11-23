#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "../src");
const forbidden = /^(?:lucide-react|react-icons|@heroicons(?:\/[^/]+)?|@tabler\/icons(?:-react)?|@radix-ui\/react-icons)(?:\/|$)/;
const pulso = /^pulsoicon-react(?:\/|$)/;
const sparkle = /sparkle/i;
const errors = [];
const imports = new Map();

function scan(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const location = (node) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    return `${path.relative(root, file)}:${line + 1}`;
  };

  function visit(node) {
    if (ts.isStringLiteralLike(node)) {
      const parent = node.parent;
      const isModuleSpecifier =
        parent.moduleSpecifier === node ||
        ts.isExternalModuleReference(parent) ||
        (ts.isImportTypeNode(parent.parent) && parent.parent.argument === parent) ||
        (ts.isCallExpression(parent) && parent.arguments[0] === node &&
          (parent.expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(parent.expression) && parent.expression.text === "require")));

      if (isModuleSpecifier && forbidden.test(node.text)) {
        errors.push(`${location(node)}: nguồn icon bị cấm ${node.text}`);
      }
      if (isModuleSpecifier && sparkle.test(node.text) && pulso.test(node.text)) {
        errors.push(`${location(node)}: tên icon bị cấm ${node.text}`);
      }
    }

    if ((ts.isImportSpecifier(node) || ts.isExportSpecifier(node)) &&
      [node.propertyName, node.name].some((name) => name && sparkle.test(name.text))) {
      errors.push(`${location(node)}: tên icon bị cấm ${node.getText(source)}`);
    }
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      sparkle.test(node.tagName.getText(source))) {
      errors.push(`${location(node)}: tên icon bị cấm ${node.tagName.getText(source)}`);
    }

    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier && pulso.test(node.moduleSpecifier.text)) {
      const bindings = ts.isImportDeclaration(node) ? node.importClause?.namedBindings : node.exportClause;
      if (!bindings || (!ts.isNamedImports(bindings) && !ts.isNamedExports(bindings))) {
        errors.push(`${location(node)}: dùng named imports cho PulsoIcon`);
      } else {
        const typeOnly = ts.isImportDeclaration(node) ? node.importClause.isTypeOnly : node.isTypeOnly;
        for (const item of bindings.elements) {
          if (typeOnly || item.isTypeOnly) continue;
          const from = node.moduleSpecifier.text;
          if (!imports.has(from)) imports.set(from, new Map());
          imports.get(from).set((item.propertyName ?? item.name).text, location(item));
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

function scanDirectory(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) scanDirectory(fullPath);
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) scan(fullPath);
  }
}

async function main() {
  scanDirectory(root);
  if (errors.length === 0) {
    for (const [from, names] of imports) {
      try {
        const exports = await import(from);
        for (const [name, location] of names) {
          if (!Object.hasOwn(exports, name)) {
            errors.push(`${location}: ${from} không export ${name}`);
          }
        }
      } catch (error) {
        errors.push(`Không tải được ${from}: ${error.message}`);
      }
    }
  }

  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    const count = [...imports.values()].reduce((total, names) => total + names.size, 0);
    console.log(`OK: chỉ dùng PulsoIcon và đã xác minh ${count} export runtime.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
