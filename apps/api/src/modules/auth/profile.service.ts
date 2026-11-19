import { Prisma, prisma } from "@repo/db";
import type { DeleteProfileInput, UpdateProfileInput, UserProfileDto } from "@repo/shared";
import { auth } from "./auth";
import { DomainError } from "../../core/errors/domain-error";
import { logger } from "../../core/logger";
import { CloudinaryGateway } from "../media/infrastructure/cloudinary.gateway";
import { validateAvatar } from "./avatar-validation";

const profileSelect = { id: true, name: true, email: true, emailVerified: true, image: true, role: true } as const;

export class ProfileService {
  constructor(private readonly db = prisma, private readonly storage: Pick<CloudinaryGateway, "uploadAvatar" | "deleteAvatar"> = new CloudinaryGateway()) {}

  async get(userId: string): Promise<UserProfileDto> {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: profileSelect });
    if (!user) throw new DomainError(401, "AUTH_REQUIRED", "Phiên đăng nhập không còn hợp lệ.");
    return user;
  }

  async update(userId: string, input: UpdateProfileInput): Promise<UserProfileDto> {
    if (input.image === null) return this.replaceImage(userId, null, input.name);
    return this.db.user.update({ where: { id: userId }, data: { name: input.name }, select: profileSelect });
  }

  private async replaceImage(userId: string, image: string | null, name?: string): Promise<UserProfileDto> {
    const result = await this.db.$transaction(async (tx) => {
      // Serialize only the short database replacement, never the provider upload.
      await tx.$queryRaw(Prisma.sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);
      const previous = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { image: true } });
      const user = await tx.user.update({ where: { id: userId }, data: { image, ...(name !== undefined ? { name } : {}) }, select: profileSelect });
      return { user, previousImage: previous.image };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    if (result.previousImage && result.previousImage !== image) await this.cleanupAvatar(userId, result.previousImage);
    return result.user;
  }

  private async cleanupAvatar(userId: string, image: string | null): Promise<void> {
    try { await this.storage.deleteAvatar(userId, image); }
    catch (error) { logger.error({ err: error, userId, image }, "Removed avatar requires provider cleanup"); }
  }

  async uploadAvatar(userId: string, file: File): Promise<UserProfileDto> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    validateAvatar(bytes, file.type);
    let image: string;
    try { image = await this.storage.uploadAvatar(userId, bytes, file.type); }
    catch (error) {
      logger.warn({ err: error, userId }, "Avatar upload failed");
      throw new DomainError(503, "MEDIA_PROVIDER_UNAVAILABLE", "Chưa tải được ảnh lên. Vui lòng thử lại.");
    }
    let user: UserProfileDto;
    try { user = await this.replaceImage(userId, image); }
    catch (error) { await this.cleanupAvatar(userId, image); throw error; }
    return user;
  }

  async delete(userId: string, input: DeleteProfileInput): Promise<{ success: true }> {
    const credential = await this.db.account.findFirst({ where: { userId, providerId: "credential" }, select: { password: true } });
    const context = await auth.$context;
    if (!credential?.password || !await context.password.verify({ hash: credential.password, password: input.password })) {
      throw new DomainError(400, "BAD_REQUEST", "Mật khẩu hiện tại không đúng hoặc tài khoản chưa có mật khẩu.");
    }
    let removedImage: string | null = null;
    try {
      removedImage = await this.db.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        if (user.role.split(",").includes("admin") && await tx.user.count({ where: { role: { contains: "admin" }, banned: false } }) <= 1) {
          throw new DomainError(409, "CONFLICT", "Không thể xóa quản trị viên cuối cùng đang hoạt động.");
        }
        // FK restrictions preserve shared editorial content; the transaction rolls back every deletion on conflict.
        if (await tx.mediaAsset.count({ where: { uploadedById: userId } })) {
          throw new DomainError(409, "CONFLICT", "Tài khoản còn media trong thư viện chung. Vui lòng bàn giao trước khi xóa.");
        }
        await tx.user.delete({ where: { id: userId } });
        return user.image;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2003", "P2034"].includes(error.code)) {
        throw new DomainError(409, "CONFLICT", "Tài khoản còn liên kết nội dung hoặc phân công. Vui lòng liên hệ quản trị viên để bàn giao rồi thử lại.");
      }
      throw error;
    }
    await this.cleanupAvatar(userId, removedImage);
    return { success: true };
  }
}
