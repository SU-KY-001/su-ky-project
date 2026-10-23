export type Point2 = readonly [number, number];
export type Point3 = [number, number, number];

export interface Artwork {
  id: string;
  image: string;
  aspect: number;
  title: string;
  description: string;
  date: string;
  credit: string;
  sourceUrl: string;
  rights: string;
  chapter: number;
  position: Point3;
  rotation: number;
  width: number;
}

const imageFiles = import.meta.glob<string>("../../public/30-4-1975/*.jpg", {
  eager: true, query: "?url", import: "default",
});

function photo(id: string): string {
  const match = Object.entries(imageFiles).find(([path]) => path.includes(id) && !path.includes("(1)"));
  if (!match) throw new Error(`Không tìm thấy ảnh tư liệu ${id} trong src/public/30-4-1975.`);
  return match[1];
}

const source = (id: string): string => `https://vnanet.vn/vi/anh/anh-chuyen-de-1053/48-nam-${id.startsWith("669") ? "ngay-giai-phong-hoan-toan" : "giai-phong"}-mien-nam-thong-nhat-dat-nuoc-3041975--3042023-trang-su-hao-hung-tren-con-duong-dung-nuoc-va-giu-nuoc-${id}.html`;
const rights = "Bản quyền thuộc TTXVN và tác giả. Ảnh do chủ dự án cung cấp; chưa có thông tin giấy phép tái sử dụng kèm theo. Cần xác nhận quyền sử dụng trước khi công bố rộng rãi.";

function work(item: Omit<Artwork, "image" | "sourceUrl" | "rights">): Artwork {
  return { ...item, image: photo(item.id), sourceUrl: source(item.id), rights };
}

export const artworks: Artwork[] = [
  work({ id: "6704087", aspect: 850 / 558, title: "Trước giờ chiến dịch", description: "Đại tướng Võ Nguyên Giáp và Quân ủy Trung ương duyệt phương án tác chiến tại Hà Nội.", date: "Tháng 4/1975", credit: "TTXVN", chapter: 0, position: [-5.81, 2, 6.6], rotation: Math.PI / 2, width: 3.25 }),
  work({ id: "6704089", aspect: 877 / 614, title: "Lá cờ trước giờ lên đường", description: "Lễ trao cờ cho Đại đội 2, Tiểu đoàn 9, Trung đoàn 3 trước chiến dịch giải phóng Sài Gòn.", date: "Tháng 4/1975", credit: "Quang Thành / TTXVN", chapter: 0, position: [-5.81, 2, -0.5], rotation: Math.PI / 2, width: 2.65 }),
  work({ id: "6704096", aspect: 926 / 614, title: "Đà Nẵng, mùa xuân 1975", description: "Nhân dân đón bộ binh và xe tăng quân giải phóng tiến vào thành phố.", date: "Tháng 3/1975", credit: "Quang Thành / TTXVN", chapter: 0, position: [-1.4, 2.1, -7.81], rotation: 0, width: 3.6 }),
  work({ id: "6704102", aspect: 709 / 500, title: "Cánh cửa phía Tây Bắc", description: "Sư đoàn 320 tiến công căn cứ Đồng Dù, Củ Chi, mở đường vào Sài Gòn.", date: "29/4/1975", credit: "Lê Trung Hưng / TTXVN", chapter: 0, position: [5.81, 2, 5.2], rotation: -Math.PI / 2, width: 2.6 }),
  work({ id: "6698555", aspect: 850 / 595, title: "Khoảnh khắc toàn thắng", description: "Xe tăng quân giải phóng vượt cổng Dinh Độc Lập trong trưa 30 tháng Tư.", date: "30/4/1975", credit: "Mai Hưởng / TTXVN", chapter: 1, position: [21.81, 2.15, -2.4], rotation: -Math.PI / 2, width: 3.6 }),
  work({ id: "6698502", aspect: 1072 / 781, title: "Tiến vào Dinh Độc Lập", description: "Bùi Quang Thận cầm cờ cùng đồng đội tiến vào Dinh để thực hiện nhiệm vụ cắm cờ.", date: "30/4/1975", credit: "Vũ Tạo / TTXVN", chapter: 1, position: [10.7, 2, 3.81], rotation: Math.PI, width: 2.8 }),
  work({ id: "6698556", aspect: 850 / 535, title: "Trưa tháng Tư lịch sử", description: "Xe tăng và quân giải phóng tại Dinh Độc Lập khi chiến dịch đi đến thắng lợi.", date: "30/4/1975", credit: "Mai Hưởng / TTXVN", chapter: 1, position: [17.7, 2, 3.81], rotation: Math.PI, width: 3.1 }),
  work({ id: "6698566", aspect: 378 / 614, title: "Chiến tranh khép lại", description: "Dương Văn Minh phát biểu sau tuyên bố đầu hàng vô điều kiện.", date: "30/4/1975", credit: "TTXVN", chapter: 1, position: [9.1, 2.05, -7.81], rotation: 0, width: 1.3 }),
  work({ id: "6698575", aspect: 850 / 570, title: "Tin chiến thắng trên làn sóng", description: "Nhân viên Đài Phát thanh Sài Gòn trở lại công việc, đưa tin về thành phố.", date: "Năm 1975", credit: "Vũ Tạo / TTXVN", chapter: 2, position: [10.19, 2, -13.6], rotation: Math.PI / 2, width: 2.8 }),
  work({ id: "6698585", aspect: 850 / 564, title: "Bến cảng trong ngày mới", description: "Quân giải phóng tiếp quản Cảng Bạch Đằng tại Sài Gòn.", date: "Tháng 4/1975", credit: "Vũ Tạo / TTXVN", chapter: 2, position: [21.81, 2, -12.5], rotation: -Math.PI / 2, width: 2.7 }),
  work({ id: "6698592", aspect: 850 / 562, title: "Nhịp sống trở lại", description: "Thanh thiếu niên cùng làm vệ sinh đường phố Sài Gòn sau giải phóng.", date: "Năm 1975", credit: "Vũ Tạo / TTXVN", chapter: 2, position: [21.81, 2, -19], rotation: -Math.PI / 2, width: 2.8 }),
  work({ id: "6698593", aspect: 850 / 550, title: "Những gương mặt ngày hòa bình", description: "Thanh niên Quận 3 dự mít tinh kỷ niệm ngày sinh Chủ tịch Hồ Chí Minh.", date: "19/5/1975", credit: "Văn Bảo / TTXVN", chapter: 2, position: [16.2, 2.1, -23.81], rotation: 0, width: 3.7 }),
];

export const chapters = [
  { title: "Đường đến Sài Gòn", period: "Mùa xuân 1975", description: "Những bước chân hướng về ngày toàn thắng.", spawn: [0.6, 1.65, 9.4] as Point3, yaw: 0.16 },
  { title: "Ngày toàn thắng", period: "30 tháng 4 năm 1975", description: "Một thời khắc làm nên lịch sử.", spawn: [8.3, 1.65, -3] as Point3, yaw: -Math.PI / 2 },
  { title: "Đất nước liền một dải", period: "Những ngày đầu hòa bình", description: "Khi cuộc sống bắt đầu một chương mới.", spawn: [16, 1.65, -10.3] as Point3, yaw: 0 },
];

export interface Wall { a: Point2; b: Point2 }
export const walls: Wall[] = [
  { a: [-6, 12], b: [6, 12] }, { a: [-6, -8], b: [-6, 12] },
  { a: [-6, -8], b: [6, -8] }, { a: [6, -8], b: [6, -5] },
  { a: [6, -1], b: [6, 12] }, { a: [6, 4], b: [22, 4] },
  { a: [22, 4], b: [22, -24] }, { a: [6, -8], b: [14, -8] },
  { a: [18, -8], b: [22, -8] }, { a: [10, -8], b: [10, -22] },
  { a: [10, -22], b: [12, -24] }, { a: [12, -24], b: [22, -24] },
  { a: [-6, 12], b: [-4.5, 10.5] },
];

export const floorAreas = [
  { x: 0, z: 2, width: 12, depth: 20 },
  { x: 14, z: -2, width: 16, depth: 12 },
  { x: 16, z: -16, width: 12, depth: 16 },
];

export const galleryPalette = {
  wall: "#c9ccd3", floor: "#8e9195", ceiling: "#55595f", trim: "#7a7d82",
  frame: "#3b3e43", mount: "#d9dbe0", ink: "#30343b", muted: "#50555e",
  light: "#ffffff", rail: "#7a7d82", bench: "#8e9195",
};

export function chapterAt(x: number, z: number): number {
  return z < -8 && x > 9 ? 2 : x > 6 ? 1 : 0;
}
