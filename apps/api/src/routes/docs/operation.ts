import type { ZodTypeAny } from "zod";
import {
  COMMON_RESPONSES,
  RETRY_AFTER_HEADER,
  IDEMPOTENCY_KEY_PARAM,
  SECURITY_BEARER,
  SECURITY_COOKIE,
  STATUS_TO_COMMON_RESPONSE,
  errorResponseRef,
} from "./components";
import { component, parametersFrom, type JsonSchema } from "./registry";

/**
 * Who may call an operation. Mirrors the Hono guards:
 * - `optional`: `attachSession` (anonymous allowed, signed-in users get personalised data)
 * - `user`: `requireAuth`
 * - `studio`: `requireRole("moderator", "admin")`
 * - `moderator`: `requireRole("moderator")` only (admins are excluded on purpose)
 * - `admin`: `requireAdmin`
 */
export type Access = "public" | "optional" | "user" | "studio" | "moderator" | "admin";

export type RatePolicy = "write" | "media_upload" | "listening_progress" | "ai_import";

type Method = "get" | "post" | "put" | "patch" | "delete";

interface SchemaInput {
  name: string;
  schema: ZodTypeAny;
}

interface BodyInput extends SchemaInput {
  example?: unknown;
  description?: string;
}

interface OkInput {
  status: 200 | 201 | 204;
  description: string;
  schema?: SchemaInput;
  example?: unknown;
  /** Adds the `Location` header on 201 responses. */
  location?: string;
  /** Overrides the default `application/json` media type (e.g. SSE). */
  contentType?: string;
  contentSchema?: JsonSchema;
}

export interface OperationInput {
  id: string;
  tag: string;
  summary: string;
  description?: string;
  access: Access;
  pathParams?: ZodTypeAny;
  pathParamDocs?: Record<string, string>;
  query?: ZodTypeAny;
  queryDocs?: Record<string, string>;
  body?: BodyInput;
  ok: OkInput;
  /** Extra business error notes keyed by HTTP status, merged with the generated ones. */
  errors?: Record<number, string>;
  idempotent?: boolean;
  rate?: RatePolicy;
  /** Replaces generated responses verbatim, for the rare endpoint whose error body is not the shared envelope. */
  responseOverrides?: Record<string, unknown>;
}

const ACCESS_DOC: Record<Access, string | null> = {
  public: null,
  optional: "Công khai. Nếu đã đăng nhập, kết quả kèm dữ liệu cá nhân hoá.",
  user: "Yêu cầu đăng nhập.",
  studio: "Yêu cầu vai trò Moderator hoặc Admin.",
  moderator: "Yêu cầu vai trò Moderator (Admin bị loại trừ).",
  admin: "Yêu cầu vai trò Admin.",
};

const ROLES: Record<Access, string[]> = {
  public: [],
  optional: [],
  user: ["user", "moderator", "admin"],
  studio: ["moderator", "admin"],
  moderator: ["moderator"],
  admin: ["admin"],
};

const RATE_DOC: Record<RatePolicy, string> = {
  write: "ghi nội dung",
  media_upload: "upload media",
  listening_progress: "đồng bộ tiến trình nghe",
  ai_import: "nhập kịch bản AI",
};

const IDEMPOTENCY_NOTES: Array<[number, string]> = [
  [400, "`IDEMPOTENCY_KEY_REQUIRED`: thiếu hoặc sai định dạng `Idempotency-Key`"],
  [409, "`IDEMPOTENCY_REQUEST_IN_PROGRESS`: request gốc còn đang chạy (có `Retry-After`)"],
  [422, "`IDEMPOTENCY_KEY_REUSED`: cùng key nhưng khác nội dung request"],
];

function securityFor(access: Access): Array<Record<string, string[]>> {
  if (access === "public") return [];
  const schemes: Array<Record<string, string[]>> = [{ [SECURITY_COOKIE]: [] }, { [SECURITY_BEARER]: [] }];
  return access === "optional" ? [{}, ...schemes] : schemes;
}

function addNote(notes: Map<number, string[]>, status: number, note: string): void {
  notes.set(status, [...(notes.get(status) ?? []), note]);
}

function buildErrorNotes(input: OperationInput): Map<number, string[]> {
  const notes = new Map<number, string[]>();
  const hasInput = Boolean(input.pathParams || input.query || input.body);
  if (hasInput) addNote(notes, 400, "`VALIDATION_ERROR`: path, query hoặc body sai schema");
  if (input.access !== "public" && input.access !== "optional") addNote(notes, 401, "`AUTH_REQUIRED`");
  if (input.access === "studio" || input.access === "moderator" || input.access === "admin") {
    addNote(notes, 403, "`FORBIDDEN`: không đủ vai trò");
  }
  if (input.rate) addNote(notes, 429, `\`RATE_LIMITED\`: vượt hạn mức ${RATE_DOC[input.rate]}`);
  if (input.idempotent) for (const [status, note] of IDEMPOTENCY_NOTES) addNote(notes, status, note);
  for (const [status, note] of Object.entries(input.errors ?? {})) addNote(notes, Number(status), note);
  addNote(notes, 500, "`INTERNAL_SERVER_ERROR`");
  return notes;
}

function errorResponses(input: OperationInput): Record<string, unknown> {
  const responses: Record<string, unknown> = {};
  for (const [status, notes] of buildErrorNotes(input)) {
    const common = COMMON_RESPONSES[STATUS_TO_COMMON_RESPONSE[status] ?? "InternalError"];
    const defaultOnly = notes.length === 1 && (status === 401 || status === 500);
    responses[String(status)] = defaultOnly
      ? { $ref: `#/components/responses/${STATUS_TO_COMMON_RESPONSE[status]}` }
      : {
          description: notes.join("; "),
          ...("headers" in common ? { headers: common.headers } : {}),
          ...(status === 409 && input.idempotent ? { headers: RETRY_AFTER_HEADER } : {}),
          content: { "application/json": { schema: errorResponseRef } },
        };
  }
  return responses;
}

function successResponse(input: OperationInput): Record<string, unknown> {
  const { ok } = input;
  const headers: Record<string, unknown> = {};
  if (ok.location) {
    headers.Location = { description: `URL tài nguyên vừa tạo: \`${ok.location}\``, schema: { type: "string" } };
  }
  if (input.idempotent) {
    headers["Idempotent-Replayed"] = {
      description: "Có mặt (`true`) khi response là kết quả lưu từ lần gửi `Idempotency-Key` trước.",
      schema: { type: "string" },
    };
  }
  const response: Record<string, unknown> = { description: ok.description };
  if (Object.keys(headers).length > 0) response.headers = headers;
  if (ok.status === 204) return response;
  const mediaType = ok.contentType ?? "application/json";
  const schema = ok.contentSchema ?? (ok.schema ? component(ok.schema.name, ok.schema.schema) : undefined);
  response.content = {
    [mediaType]: { ...(schema ? { schema } : {}), ...(ok.example === undefined ? {} : { example: ok.example }) },
  };
  return response;
}

function buildDescription(input: OperationInput): string {
  const parts = [input.description, ACCESS_DOC[input.access]].filter((part): part is string => Boolean(part));
  if (input.rate) parts.push(`Giới hạn tốc độ theo người dùng (chính sách \`${input.rate}\`: ${RATE_DOC[input.rate]}).`);
  if (input.idempotent) parts.push("Bắt buộc header `Idempotency-Key`.");
  return parts.join("\n\n");
}

/** Builds one OpenAPI operation; callers wrap it in `{ [method]: ... }`. */
export function operation(input: OperationInput): Record<string, unknown> {
  const parameters: unknown[] = [];
  if (input.idempotent) parameters.push({ $ref: `#/components/parameters/${IDEMPOTENCY_KEY_PARAM}` });
  if (input.pathParams) parameters.push(...parametersFrom("path", input.pathParams, input.pathParamDocs));
  if (input.query) parameters.push(...parametersFrom("query", input.query, input.queryDocs));

  return {
    operationId: input.id,
    tags: [input.tag],
    summary: input.summary,
    description: buildDescription(input),
    ...(parameters.length > 0 ? { parameters } : {}),
    ...(input.body
      ? {
          requestBody: {
            required: true,
            ...(input.body.description ? { description: input.body.description } : {}),
            content: {
              "application/json": {
                schema: component(input.body.name, input.body.schema),
                ...(input.body.example === undefined ? {} : { example: input.body.example }),
              },
            },
          },
        }
      : {}),
    responses: {
      [String(input.ok.status)]: successResponse(input),
      ...errorResponses(input),
      ...input.responseOverrides,
    },
    security: securityFor(input.access),
    "x-required-roles": ROLES[input.access],
  };
}

export type PathItem = Partial<Record<Method, Record<string, unknown>>>;
export type Paths = Record<string, PathItem>;
