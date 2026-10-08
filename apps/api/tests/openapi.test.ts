import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { routes } from "../src/app";
import { openApiSpec } from "../src/routes/docs";

// Parameters are either inline or a `$ref` (the shared Idempotency-Key header).
const ParametersSchema = z.array(
  z.union([z.object({ in: z.string(), name: z.string() }), z.object({ $ref: z.string() })])
);

const toTemplate = (path: string) => path.replace(/:(\w+)/g, "{$1}");
const OPERATION_KEY_PATTERN = /^(get|post|put|patch|delete)$/;

const documented = new Set<string>();
for (const [path, item] of Object.entries(openApiSpec.paths)) {
  for (const method of Object.keys(item).filter((key) => OPERATION_KEY_PATTERN.test(key))) {
    documented.add(`${method} ${path.replace(/\{\w+\}/g, "{}")}`);
  }
}

// Better Auth owns /api/auth/*; the docs and OpenAPI routes describe themselves.
const implemented = new Set(
  routes.routes
    .filter((route) => route.method !== "ALL" && !route.path.endsWith("*"))
    .filter((route) => !["/", "/docs", "/openapi.json"].includes(route.path))
    .map((route) => `${route.method.toLowerCase()} ${toTemplate(route.path).replace(/\{\w+\}/g, "{}")}`)
);

describe("OpenAPI spec", () => {
  it("documents every implemented route", () => {
    expect([...implemented].filter((key) => !documented.has(key))).toEqual([]);
  });

  it("documents no route that does not exist", () => {
    const stale = [...documented].filter((key) => !implemented.has(key) && !key.includes("/api/auth/"));
    expect(stale).toEqual([]);
  });

  it("resolves every $ref", () => {
    const missing: string[] = [];
    JSON.stringify(openApiSpec, (key, value) => {
      if (key === "$ref" && typeof value === "string") {
        const target = value
          .replace("#/", "")
          .split("/")
          .reduce<unknown>((node, part) => (typeof node === "object" && node !== null ? Reflect.get(node, part) : undefined), openApiSpec);
        if (!target) missing.push(value);
      }
      return value;
    });
    expect(missing).toEqual([]);
  });

  it("declares path parameters that match each path template", () => {
    const mismatched: string[] = [];
    for (const [path, item] of Object.entries(openApiSpec.paths)) {
      const expected = [...path.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
      for (const [method, operation] of Object.entries(item)) {
        const declared = ParametersSchema.parse(operation.parameters ?? [])
          .flatMap((parameter) => ("in" in parameter && parameter.in === "path" ? [parameter.name] : []))
          .sort();
        if (JSON.stringify(expected) !== JSON.stringify(declared)) mismatched.push(`${method} ${path}`);
      }
    }
    expect(mismatched).toEqual([]);
  });
});
