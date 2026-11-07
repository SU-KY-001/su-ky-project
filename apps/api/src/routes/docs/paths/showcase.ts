import { PublicHonorsQuerySchema, PublicHonorsSchema, PublicReleaseQuerySchema, PublicReleasesSchema } from "@repo/shared";
import { operation, type Paths } from "../operation";

export const showcasePaths: Paths = {
  "/api/showcase/honors": { get: operation({ id: "getPublicHonors", tag: "Listening", summary: "Vinh danh XP tuần hoặc tháng", description: "10 người nghe không bị khóa có XP dương trong kỳ hiện tại, theo lịch Việt Nam. Không trả ID, email hay thông tin phiên.", access: "public", query: PublicHonorsQuerySchema, ok: { status: 200, description: "Bảng vinh danh từ XP đã được ghi nhận", schema: { name: "PublicShowcaseHonors", schema: PublicHonorsSchema } } }) },
  "/api/showcase/releases": { get: operation({ id: "getPublicReleases", tag: "Listening", summary: "Lịch phát hành công khai theo series", description: "Chỉ lịch sẵn sàng phát hành hoặc đã phát hành của series công khai, không bao gồm lịch đang biên tập, bị hủy hay thất bại. Khoảng truy vấn tối đa 62 ngày, từ from (bao gồm) đến to (không bao gồm).", access: "public", query: PublicReleaseQuerySchema, ok: { status: 200, description: "Các mốc phát hành đủ điều kiện công khai", schema: { name: "PublicShowcaseReleases", schema: PublicReleasesSchema } } }) },
};
