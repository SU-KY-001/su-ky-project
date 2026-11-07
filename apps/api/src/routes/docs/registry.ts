import type { ZodTypeAny } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export type JsonSchema = Record<string, unknown>;
export type SchemaRef = { $ref: string };

const SCHEMA_REF_PREFIX = "#/components/schemas/";
const registry = new Map<string, JsonSchema>();
const sources = new Map<string, ZodTypeAny>();

/**
 * zod-to-json-schema emits draft-07 tuples (`items: [...]`, `additionalItems`), which are
 * invalid in OpenAPI 3.1 (JSON Schema 2020-12). Rewrite them to `prefixItems`.
 */
function normalizeTuples(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(normalizeTuples);
  if (node === null || typeof node !== "object") return node;
  const result: JsonSchema = {};
  for (const [key, value] of Object.entries(node)) result[key] = normalizeTuples(value);
  if (Array.isArray(result.items)) {
    result.prefixItems = result.items;
    result.items = result.additionalItems ?? false;
    delete result.additionalItems;
  }
  return result;
}

/**
 * Converts a zod schema to an OpenAPI 3.1 (JSON Schema 2020-12 compatible) fragment.
 * The JSON Schema draft-07 target is kept on purpose: OpenAPI 3.1 dropped the 3.0
 * `nullable` keyword, so the `openApi3` target would emit invalid output here.
 */
export function toJsonSchema(schema: ZodTypeAny): JsonSchema {
  const converted = zodToJsonSchema(schema, { $refStrategy: "none", target: "jsonSchema7" }) as JsonSchema;
  delete converted.$schema;
  return normalizeTuples(converted) as JsonSchema;
}

/** Registers a named component schema once and returns a `$ref` to it. Reusing a name for a different schema is a bug. */
export function component(name: string, schema: ZodTypeAny): SchemaRef {
  const known = sources.get(name);
  if (known && known !== schema) throw new Error(`OpenAPI component "${name}" is registered with two different schemas`);
  if (!known) {
    sources.set(name, schema);
    registry.set(name, toJsonSchema(schema));
  }
  return { $ref: `${SCHEMA_REF_PREFIX}${name}` };
}

export const registeredSchemas = (): Record<string, JsonSchema> => Object.fromEntries(registry);

interface ParameterObject {
  name: string;
  in: "path" | "query";
  required: boolean;
  description?: string;
  schema: JsonSchema;
}

/** Expands an object schema into OpenAPI path or query parameters. */
export function parametersFrom(
  location: ParameterObject["in"],
  schema: ZodTypeAny,
  descriptions: Record<string, string> = {}
): ParameterObject[] {
  const json = toJsonSchema(schema) as { properties?: Record<string, JsonSchema>; required?: string[] };
  const required = new Set(json.required ?? []);
  return Object.entries(json.properties ?? {}).map(([name, propertySchema]) => ({
    name,
    in: location,
    required: location === "path" || required.has(name),
    ...(descriptions[name] ? { description: descriptions[name] } : {}),
    schema: propertySchema,
  }));
}
