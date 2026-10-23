import { ANGLE_BUILTIN_PREFIX, type Angle, type CreateAngleInput, type UpdateAngleInput } from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";
import { ANGLE_FIELD_LIMITS, cleanName, cleanText, nameKey } from "./angle-text";
import type { AngleRepository } from "./angle.repository";
import { BUILTIN_ANGLES, findBuiltinAngle } from "./builtin-angles";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUILTIN_KEYS: ReadonlySet<string> = new Set(BUILTIN_ANGLES.map((angle) => nameKey(angle.name)));

const notFound = () => new DomainError(404, "NOT_FOUND", "Góc kể không tồn tại");
const nameTaken = () => new DomainError(409, "ANGLE_NAME_TAKEN", "Đã có góc kể trùng tên");

export interface AngleServiceDeps {
  repo: AngleRepository;
  maxPerUser: number;
}

/** What the compose prompts need from an angle (the server loads it; the client never sends `guide`). */
export type ResolvedAngle = Pick<Angle, "name" | "description" | "guide">;

export class AngleService {
  constructor(private readonly deps: AngleServiceDeps) {}

  async list(userId: string): Promise<Angle[]> {
    return [...BUILTIN_ANGLES, ...(await this.deps.repo.listByUser(userId))];
  }

  async create(userId: string, input: CreateAngleInput): Promise<Angle> {
    const clean = normalize(input) as CreateAngleInput;
    if (BUILTIN_KEYS.has(nameKey(clean.name))) throw nameTaken();
    const created = await this.deps.repo.create(userId, clean, this.deps.maxPerUser);
    if (created.ok) return created.angle;
    if (created.reason === "LIMIT") {
      throw new DomainError(422, "ANGLE_LIMIT", `Mỗi người tối đa ${this.deps.maxPerUser} góc kể`);
    }
    throw nameTaken();
  }

  async update(userId: string, id: string, input: UpdateAngleInput): Promise<Angle> {
    if (!UUID.test(id)) throw notFound();
    const clean = normalize(input);
    if (clean.name !== undefined && BUILTIN_KEYS.has(nameKey(clean.name))) throw nameTaken();
    const updated = await this.deps.repo.update(userId, id, clean);
    if (updated.ok) return updated.angle;
    throw updated.reason === "NAME_TAKEN" ? nameTaken() : notFound();
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!UUID.test(id) || !(await this.deps.repo.remove(userId, id))) throw notFound();
  }

  /** Null for an unknown id, a built-in that no longer exists, or an angle of another user. */
  async resolveAngle(userId: string, angleId: string): Promise<ResolvedAngle | null> {
    if (angleId.startsWith(ANGLE_BUILTIN_PREFIX)) return findBuiltinAngle(angleId) ?? null;
    if (!UUID.test(angleId)) return null;
    return this.deps.repo.findOwned(userId, angleId);
  }
}

/** Normalises provided fields; a name that is empty after cleaning, or any field over its limit, is a 422. */
function normalize(input: UpdateAngleInput): UpdateAngleInput {
  const out: UpdateAngleInput = {};
  for (const field of ["name", "description", "guide"] as const) {
    const raw = input[field];
    if (raw === undefined) continue;
    const value = field === "name" ? cleanName(raw) : cleanText(raw);
    if ((field === "name" && value.length === 0) || value.length > ANGLE_FIELD_LIMITS[field]) {
      throw new DomainError(422, "VALIDATION_ERROR", `Trường ${field} không hợp lệ`);
    }
    out[field] = value;
  }
  return out;
}
