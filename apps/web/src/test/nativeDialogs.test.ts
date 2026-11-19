import { expect, it } from "bun:test";
import { resolve } from "node:path";
import ts from "typescript";

it("does not use native browser alert, confirm or prompt anywhere in app source", async () => {
  const sourceRoot = resolve(import.meta.dir, "..");
  const forbidden = new Set(["alert", "confirm", "prompt"]);
  const browserGlobals = new Set(["window", "globalThis", "self"]);
  const violations: string[] = [];
  for await (const path of new Bun.Glob("**/*.{ts,tsx}").scan(sourceRoot)) {
    if (/\.(test|spec)\.[jt]sx?$/.test(path)) continue;
    const source = ts.createSourceFile(path, await Bun.file(resolve(sourceRoot, path)).text(), ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node): void {
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        const direct = ts.isIdentifier(callee) && forbidden.has(callee.text);
        const property = ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)
          && browserGlobals.has(callee.expression.text) && forbidden.has(callee.name.text);
        const computed = ts.isElementAccessExpression(callee) && ts.isIdentifier(callee.expression)
          && browserGlobals.has(callee.expression.text) && ts.isStringLiteral(callee.argumentExpression)
          && forbidden.has(callee.argumentExpression.text);
        if (direct || property || computed) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          violations.push(`${path}:${line + 1}: ${callee.getText(source)}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  expect(violations).toEqual([]);
});
