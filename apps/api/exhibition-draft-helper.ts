import { prisma } from "@repo/db";
import { ExhibitionDocumentSchema, exhibitionTemplate, validateExhibitionPlacements } from "@repo/shared";
import { mediaService, mediaStorage } from "./src/modules/media";
import { PrismaExhibitionRepository } from "./src/modules/exhibition/infrastructure/prisma-exhibition.repository";
import { ExhibitionService } from "./src/modules/exhibition/application/exhibition.service";
import { readFile, writeFile, readdir } from "node:fs/promises";

const ownerId = "MDYzo7AMp4Tm1taqnZTx1NzSAciBrCNr";
const progressPath = "C:/Users/Huy/AppData/Local/Temp/su-ky-exhibition-30-4-progress.json";
const sourceDir = "D:/FPT/ky8/WDP/image/30-4-1975";
const names = await readdir(sourceDir);
const sections = [
  { title: "Đường đến chiến dịch", period: "Tháng 3–4/1975", description: "Những thắng lợi ở miền Trung và công tác chuẩn bị mở đường cho chiến dịch giải phóng Sài Gòn.", pictures: [
    ["6704094", "Pháo kích sân bay Đà Nẵng", "Ngày 28/3/1975, lực lượng giải phóng tiến công sân bay và quân cảng Đà Nẵng.", "TTXVN"],
    ["6704096", "Tiến vào Đà Nẵng", "Bộ binh và xe tăng tiến vào Đà Nẵng trong sự chào đón của người dân.", "Quang Thành / TTXVN"],
    ["6704097", "Sở chỉ huy tại Đà Nẵng", "Lực lượng giải phóng làm chủ sở chỉ huy Quân đoàn I tại Đà Nẵng.", "Quang Thành / TTXVN"],
    ["6704087", "Chuẩn bị Chiến dịch Hồ Chí Minh", "Đại tướng Võ Nguyên Giáp cùng các thành viên Quân ủy Trung ương duyệt phương án tác chiến tại Hà Nội, tháng 4/1975.", "TTXVN"]
  ] },
  { title: "Tiến về Sài Gòn", period: "Tháng 4/1975", description: "Các lực lượng tiến về Sài Gòn và tiếp cận những mục tiêu trọng yếu.", pictures: [
    ["6704089", "Trao cờ trước giờ xuất phát", "Buổi trao cờ chiến thắng cho đơn vị trước khi bước vào chiến dịch giải phóng Sài Gòn.", "Quang Thành / TTXVN"],
    ["6698532", "Sân bay Tân Sơn Nhất", "Các trận địa pháo tiến công sân bay Tân Sơn Nhất trong những ngày cuối tháng 4/1975.", "Đinh Quang Thành / TTXVN"],
    ["6698538", "Làm chủ sân bay", "Lực lượng giải phóng tiến vào sân bay Tân Sơn Nhất.", "Ngọc Đản / TTXVN"],
    ["6698540", "Cờ trên sân bay", "Những lá cờ xuất hiện tại sân bay Tân Sơn Nhất ngày 30/4/1975.", "Quang Thành / TTXVN"]
  ] },
  { title: "Ngày thống nhất", period: "30/4/1975 và những ngày sau", description: "Các hình ảnh ghi lại thời khắc kết thúc chiến tranh và nhịp sống trở lại sau giải phóng.", pictures: [
    ["6698555", "Cổng Dinh Độc Lập", "Xe tăng tiến qua cổng Phủ Tổng thống chính quyền Sài Gòn vào trưa 30/4/1975.", "Mai Hưởng / TTXVN"],
    ["6698502", "Lá cờ trên nóc Dinh", "Chiến sĩ Bùi Quang Thận cùng đồng đội tiến vào cắm cờ trên nóc Phủ Tổng thống ngày 30/4/1975.", "Vũ Tạo / TTXVN"],
    ["6698545", "Cờ tại Bộ Quốc phòng", "Lực lượng giải phóng cắm cờ trên nóc Bộ Quốc phòng chính quyền Sài Gòn ngày 30/4/1975.", "Hoàng Thiểm, Vũ Tạo / TTXVN"],
    ["6698575", "Đài phát thanh trở lại hoạt động", "Nhân viên và cán bộ kỹ thuật Đài Phát thanh Sài Gòn trở lại làm việc, thông báo tin chiến thắng và hoạt động của thành phố.", "Vũ Tạo / TTXVN"]
  ] }
];
const chapters = sections.map((section, index) => ({ id: crypto.randomUUID(), roomKey: ["room-1", "room-2", "room-3"][index], title: section.title, period: section.period, description: section.description }));
const sourceUrl = "https://vtv.vn/chinh-tri/48-nam-giai-phong-mien-nam-thong-nhat-dat-nuoc-trang-su-hao-hung-tren-con-duong-dung-nuoc-va-giu-nuoc-20230430001454144.htm";
const items = sections.flatMap((section, chapter) => section.pictures.map(([id, title, description, credit], slot) => { const name = names.find(value => value.includes(id!) && !value.includes(" (1)")); if (!name) throw new Error("Không tìm thấy ảnh " + id); return { chapter, slot, title: title!, description: description!, credit: credit!, sourceUrl, path: sourceDir + "/" + name }; }));
let progress: Record<string, string> = {};
try { progress = JSON.parse(await readFile(progressPath, "utf8")); } catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error; }
try {
  for (const [index, item] of items.entries()) {
    if (progress[item.path]) { console.log(`Đã có ảnh ${index + 1}/12`); continue; }
    const file = Bun.file(item.path);
    const ticket = await mediaService.create({ kind: "IMAGE", sizeBytes: file.size, mimeType: "image/jpeg" }, ownerId);
    const data = new FormData();
    for (const [key, value] of Object.entries(ticket.upload.fields)) data.set(key, value);
    data.set("file", file, item.path.split("/").pop()!);
    const response = await fetch(ticket.upload.url, { method: "POST", body: data, signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error(`Tải ảnh ${index + 1} thất bại (HTTP ${response.status})`);
    const result = await response.json() as { public_id: string };
    await mediaService.verify(ticket.assetId, ownerId, false, result.public_id);
    progress[item.path] = ticket.assetId;
    await writeFile(progressPath, JSON.stringify(progress, null, 2), "utf8");
    console.log(`Đã tải và xác minh ảnh ${index + 1}/12`);
  }
  const images = await prisma.mediaAsset.findMany({ where: { id: { in: Object.values(progress) } }, select: { id: true, widthPx: true, heightPx: true } });
  const sizes = Object.fromEntries(images.filter(image => image.widthPx && image.heightPx).map(image => [image.id, { width: image.widthPx!, height: image.heightPx! }]));
  const document = ExhibitionDocumentSchema.parse({ schemaVersion: 1, templateId: "gallery-1975-v1", templateVersion: 1, metadata: { title: "Giải phóng miền Nam", subtitle: "Từ những ngày tháng Ba đến mùa xuân thống nhất", description: "Qua những bức ảnh tư liệu, triển lãm đưa người xem theo dấu các sự kiện dẫn đến ngày 30/4/1975 và cuộc sống sau chiến tranh.", coverAssetId: null }, audioAssetId: null, chapters, items: items.map(item => ({ id: crypto.randomUUID(), chapterId: chapters[item.chapter]!.id, imageAssetId: progress[item.path], title: item.title, description: item.description, displayDate: item.chapter === 2 ? "30/4/1975 và những ngày sau" : "Tháng 3–4/1975", credit: item.credit, sourceUrl: item.sourceUrl, rights: "", narrationId: null, placement: { ...exhibitionTemplate.suggestions[item.chapter * 4 + item.slot]!, width: 1.5, widthMode: "actual" } })) });
  const errors = validateExhibitionPlacements(document, sizes);
  if (errors.length) throw new Error(errors.join("; "));
  const existing = await prisma.exhibition.findFirst({ where: { ownerId, title: document.metadata.title }, select: { id: true } });
  if (existing) { console.log(`Đã tồn tại bản nháp: ${existing.id}`); process.exitCode = 1; }
  else {
    const service = new ExhibitionService(new PrismaExhibitionRepository(mediaStorage));
    const result = await service.create(ownerId, document);
    console.log(JSON.stringify({ id: result.id, title: result.document.metadata.title, chapters: result.document.chapters.length, items: result.document.items.length, status: result.publicationStatus }));
  }
} finally { await prisma.$disconnect(); }
