# OpenAPI Spec (`apps/api/src/routes/docs/`)

Spec OpenAPI 3.1 của toàn bộ API, viết bằng TypeScript. Phục vụ `GET /openapi.json` và giao diện Scalar `GET /docs`.

**Quy tắc chính: đổi API thì đổi spec trong cùng thay đổi.** `tests/openapi.test.ts` fail khi spec lệch route thật.

---

## 1. Cấu trúc

| File | Vai trò |
|---|---|
| `index.ts` | Ráp spec: `info` (mô tả chung, quy ước), `tags`, `x-tagGroups`, `servers` (từ env), `components`; export `openApiSpec` và `docsRoute` |
| `operation.ts` | `operation({...})` dựng một operation; tự sinh security, header, các response lỗi |
| `components.ts` | `securitySchemes`, parameter `Idempotency-Key`, response lỗi dùng chung |
| `registry.ts` | `component(name, zod)` đăng ký schema vào `components.schemas`; `toJsonSchema`; `parametersFrom` |
| `schemas.ts` | Schema zod **chỉ để mô tả response** mà handler tự dựng object (không có schema trong `@repo/shared`) |
| `paths/*.ts` | Path theo module: `system-auth`, `catalog`, `listening`, `studio` (Series và tập), `media`, `script-workflow` |

---

## 2. Cập nhật khi đổi API

| Thay đổi | Việc cần làm |
|---|---|
| Thêm route | Thêm operation vào file `paths/` của module, đúng tag. Route mới ở module mới thì tạo `paths/<module>.ts`, spread vào `allPaths` trong `index.ts`, thêm tag vào `TAGS` và `TAG_GROUPS` |
| Xoá hoặc đổi path, method | Sửa hoặc xoá operation tương ứng |
| Đổi schema request hoặc query trong `@repo/shared` | Không cần làm gì: operation tham chiếu thẳng schema zod đó |
| Đổi dạng response của handler | Sửa schema tương ứng trong `schemas.ts` (xem mục 4) |
| Thêm hoặc đổi mã lỗi nghiệp vụ (`DomainError`) | Sửa `errors` của operation; mã mới phải có trong `ERROR_CODES` ở `packages/shared/src/schemas/problem.ts` |
| Đổi guard (`requireAuth`, `requireRole`, `attachSession`) | Sửa `access` của operation |
| Thêm hoặc bỏ `idempotency()` hoặc `rateLimit()` | Sửa `idempotent` hoặc `rate` của operation |
| Đổi `Location` hoặc status thành công | Sửa `ok.status` và `ok.location` |

Sau khi sửa, chạy:

```bash
cd apps/api && bun run check-types && bun test tests/openapi.test.ts
```

---

## 3. Viết một operation

```ts
get: operation({
  id: "getThing",                 // operationId, duy nhất toàn spec, camelCase
  tag: "Studio Series",           // phải có trong TAGS (index.ts)
  summary: "Chi tiết ...",
  description: "Hành vi đáng lưu ý, bằng tiếng Việt",
  access: "studio",               // public | optional | user | studio | moderator | admin
  pathParams: UuidParamSchema,    // zod object; tên khớp {param} trong path
  pathParamDocs: { id: "ID ... (UUID)" },
  query: SomeQuerySchema,         // zod object
  queryDocs: { q: "Từ khoá ..." },
  body: { name: "CreateThing", schema: CreateThingSchema, example: {...} },
  ok: { status: 201, description: "...", schema: { name: "Thing", schema: ThingSchema }, location: "/api/things/{id}" },
  idempotent: true,               // route dùng idempotency(): thêm header bắt buộc và 3 lỗi idempotency
  rate: "write",                  // route dùng rateLimit(policy): thêm 429
  errors: { 404: "`NOT_FOUND`: ..." }, // chỉ lỗi nghiệp vụ riêng; 400/401/403/429/500 tự sinh
})
```

Quy tắc:
- `access` phản ánh **đúng** guard trong route. Admin bị loại khỏi `script-workflow` nên dùng `moderator`, không dùng `studio`.
- Mô tả `errors` theo code thật. Đọc service để lấy đúng status và `error_code`; không đoán.
- Path dùng `{param}` (không dùng `:param`), tên khớp tên trong `pathParams`.
- Route có đường dẫn cố định cạnh `/{id}` (như `/similar`, `/order`) vẫn là operation riêng; ghi chú trong description.
- Endpoint trả body lỗi không theo envelope chung (hiện chỉ `/health` 503) dùng `responseOverrides`.
- Tiếng Việt cho `summary`, `description`, ghi chú lỗi; `operationId` và `name` schema bằng tiếng Anh.

---

## 4. Schema

- **Request và query**: dùng schema trong `@repo/shared`. Không viết lại trong docs. Ngoại lệ: schema inline không export của route (ví dụ query `similar` ở `catalog.routes.ts`) được chép vào file `paths/` kèm comment.
- **Response**: ưu tiên schema từ `@repo/shared` nếu có. Nếu handler tự dựng object, thêm schema vào `schemas.ts` theo đúng mapper hoặc service. **Không tự động đồng bộ**, cần sửa tay khi mapper đổi.
- Mỗi tên `component(name, schema)` ứng với **một instance zod duy nhất**; đăng ký hai schema khác nhau cùng tên sẽ ném lỗi khi load module. Dùng chung bằng `const` ở module-level, không gọi factory như `paginatedSchema(X)` hai lần cho cùng một tên.
- `toJsonSchema` dùng target `jsonSchema7` rồi đổi tuple sang `prefixItems`. Không dùng target `openApi3` (xuất `nullable` kiểu 3.0, sai với 3.1).

---

## 5. Không nằm trong spec

- `/api/auth/*` do Better Auth quản lý: spec tự sinh bằng `auth.api.generateOpenAPISchema()` (plugin `openAPI()` trong `auth.ts`, qua `better-auth-schema.ts`), nên thêm plugin/endpoint thì tự có trong docs. `paths/system-auth.ts` chỉ chứa bản viết tay (mô tả tiếng Việt, envelope) và ghi đè bản sinh. Test bỏ qua nhóm này.
- `/docs` và `/openapi.json` tự mô tả chính chúng.

---

## 6. Kiểm tra

`apps/api/tests/openapi.test.ts` kiểm:
1. Mọi route Hono thật đều có operation.
2. Mọi operation đều có route thật.
3. Mọi `$ref` resolve được.
4. Param path khai báo khớp template.

Xem trực quan: chạy API (`bun dev` trong `apps/api`) rồi mở `http://localhost:3005/docs`. Lint chuẩn OpenAPI: lưu `/openapi.json` ra file rồi `npx @redocly/cli lint <file>`.
