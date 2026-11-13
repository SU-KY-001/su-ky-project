import bachDangHero from "../../assets/landing/bach-dang-938-hero.jpg";
import bachDangCard from "../../assets/landing/bach-dang-938-card.jpg";
import bachDangThumb from "../../assets/landing/bach-dang-938-thumb.jpg";
import dienBienPhuHero from "../../assets/landing/dien-bien-phu-1954-hero.jpg";
import dienBienPhuCard from "../../assets/landing/dien-bien-phu-1954-card.jpg";
import dienBienPhuThumb from "../../assets/landing/dien-bien-phu-1954-thumb.jpg";
import doiMoiHero from "../../assets/landing/doi-moi-1986-hero.jpg";
import doiMoiCard from "../../assets/landing/doi-moi-1986-card.jpg";
import doiMoiThumb from "../../assets/landing/doi-moi-1986-thumb.jpg";
import haiBaTrungHero from "../../assets/landing/hai-ba-trung-40-hero.jpg";
import haiBaTrungCard from "../../assets/landing/hai-ba-trung-40-card.jpg";
import haiBaTrungThumb from "../../assets/landing/hai-ba-trung-40-thumb.jpg";
import type { Citation, DiscoveryCard, FeaturedSeries, HeroSlide, TimelineEvent } from "./types";

export const heroSlides: HeroSlide[] = [
  {
    id: "bach-dang-938",
    period: "Thời kỳ tự chủ",
    year: "938",
    title: "Bạch Đằng, con nước định giang sơn",
    subtitle: "Một dòng sông. Một kế sách. Một kỷ nguyên độc lập.",
    description: "Theo dấu trận thủy chiến qua lời Ngô Quyền, người giữ cọc và những chứng tích còn nằm lại bên sông.",
    episodeCount: 5,
    duration: "96 phút",
    perspectives: "Sử gia và nhân vật",
    image: bachDangHero,
    thumbnailImage: bachDangThumb,
    imageAlt: "Trận Bạch Đằng năm 938 với chiến thuyền đi qua bãi cọc lúc bình minh",
  },
  {
    id: "hai-ba-trung",
    period: "Bắc thuộc",
    year: "40",
    title: "Hai Bà Trưng, lời thề trên đất Mê Linh",
    subtitle: "Tiếng trống Mê Linh gọi dậy một vùng đất.",
    description: "Cuộc khởi nghĩa được kể từ lời hai nữ vương và những cộng đồng đã cùng đứng lên giành lại quyền tự chủ.",
    episodeCount: 4,
    duration: "78 phút",
    perspectives: "Hai ngôi kể",
    image: haiBaTrungHero,
    thumbnailImage: haiBaTrungThumb,
    imageAlt: "Hai Bà Trưng dẫn nghĩa quân và voi chiến qua vùng đồng bằng trong sương sớm",
  },
  {
    id: "dien-bien-phu",
    period: "Hiện đại",
    year: "1954",
    title: "Điện Biên Phủ, kéo pháo qua đêm",
    subtitle: "Năm mươi sáu ngày đêm trong lòng chảo Tây Bắc.",
    description: "Hồi ức của những người kéo pháo, mở đường và bám trụ kể lại phía sau một chiến thắng vang dội.",
    episodeCount: 6,
    duration: "124 phút",
    perspectives: "Tư liệu và hồi ức",
    image: dienBienPhuHero,
    thumbnailImage: dienBienPhuThumb,
    imageAlt: "Bộ đội kéo pháo qua núi rừng Điện Biên trong đêm",
  },
  {
    id: "doi-moi",
    period: "Đương đại",
    year: "1986",
    title: "Đổi Mới, cánh cửa vừa mở",
    subtitle: "Khi lịch sử đi vào từng căn bếp và góc chợ.",
    description: "Nhịp chợ, xưởng nhỏ và những lựa chọn đời thường tái hiện một đất nước đang bước qua ngưỡng cửa đổi thay.",
    episodeCount: 4,
    duration: "82 phút",
    perspectives: "Ký ức cộng đồng",
    image: doiMoiHero,
    thumbnailImage: doiMoiThumb,
    imageAlt: "Phố Hà Nội cuối thập niên 1980 thức dậy cùng những cửa hàng nhỏ",
  },
];

export const timelineEvents: TimelineEvent[] = [
  { id: "dong-son", period: "Cổ đại", year: "TK VII TCN", title: "Văn hóa Đông Sơn", summary: "Những cộng đồng ven sông tạo nên một nền văn hóa rực rỡ, được nhận diện qua trống đồng và kỹ nghệ luyện kim.", character: "Người thợ đúc đồng", series: "Âm vang Đông Sơn", status: "upcoming" },
  { id: "hai-ba-trung", period: "Cổ đại", year: "40", title: "Khởi nghĩa Hai Bà Trưng", summary: "Từ Mê Linh, cuộc khởi nghĩa lan rộng và giành lại quyền tự chủ trong một thời gian ngắn.", character: "Trưng Trắc", series: "Lời thề Mê Linh", status: "available" },
  { id: "bach-dang", period: "Phong kiến", year: "938", title: "Chiến thắng Bạch Đằng", summary: "Ngô Quyền tận dụng thủy triều và bãi cọc để kết thúc hơn một nghìn năm Bắc thuộc.", character: "Ngô Quyền", series: "Con nước định giang sơn", status: "available" },
  { id: "lam-son", period: "Phong kiến", year: "1428", title: "Khởi nghĩa Lam Sơn", summary: "Mười năm kháng chiến đi từ vùng núi Thanh Hóa đến ngày khôi phục nền độc lập.", character: "Lê Lợi", series: "Từ Lam Sơn đến Đông Quan", status: "upcoming" },
  { id: "dien-bien-phu", period: "Hiện đại", year: "1954", title: "Chiến thắng Điện Biên Phủ", summary: "Năm mươi sáu ngày đêm làm thay đổi cục diện chiến tranh và mở đường cho Hiệp định Genève.", character: "Người lính kéo pháo", series: "Qua lòng chảo Điện Biên", status: "available" },
  { id: "doi-moi", period: "Hiện đại", year: "1986", title: "Công cuộc Đổi Mới", summary: "Những thay đổi về tư duy kinh tế mở ra một giai đoạn chuyển mình sâu rộng trong đời sống Việt Nam.", character: "Một gia đình Hà Nội", series: "Cánh cửa vừa mở", status: "available" },
];

const bachDangEpisodes = [
  { number: 1, title: "Trước giờ nước đổi", duration: "18 phút", perspectives: "Sử gia" },
  { number: 2, title: "Những người đóng cọc", duration: "21 phút", perspectives: "Người dân" },
  { number: 3, title: "Ta chọn khúc sông này", duration: "19 phút", perspectives: "Ngô Quyền" },
  { number: 4, title: "Khi triều rút", duration: "22 phút", perspectives: "Hai ngôi kể" },
  { number: 5, title: "Sau tiếng sóng", duration: "16 phút", perspectives: "Sử gia" },
];

export const featuredSeries: FeaturedSeries[] = [
  { id: "bach-dang", title: "Bạch Đằng 938", period: "Thời kỳ tự chủ", summary: "Năm chương âm thanh đi từ kế sách đến khoảnh khắc một kỷ nguyên độc lập bắt đầu.", image: bachDangCard, imageAlt: heroSlides[0].imageAlt, episodes: bachDangEpisodes },
  { id: "hai-ba-trung", title: "Lời thề Mê Linh", period: "Năm 40-43", summary: "Nhìn cuộc khởi nghĩa qua tiếng nói của hai nữ vương và những cộng đồng cùng đứng dậy.", image: haiBaTrungCard, imageAlt: heroSlides[1].imageAlt, episodes: bachDangEpisodes.map((episode, index) => ({ ...episode, number: index + 1, title: ["Gió từ Mê Linh", "Một lời thề", "Khắp sáu mươi lăm thành", "Những năm tự chủ", "Dấu chân còn lại"][index] })) },
  { id: "dien-bien-phu", title: "Qua lòng chảo Điện Biên", period: "Năm 1954", summary: "Tư liệu và hồi ức kể lại chiến dịch từ góc nhìn của những con người bình thường.", image: dienBienPhuCard, imageAlt: heroSlides[2].imageAlt, episodes: bachDangEpisodes.map((episode, index) => ({ ...episode, number: index + 1, title: ["Đường lên Tây Bắc", "Kéo pháo vào", "Quyết định khó khăn", "Năm mươi sáu ngày đêm", "Buổi chiều 7 tháng 5"][index] })) },
];

export const discoveryCards: DiscoveryCard[] = [
  { id: "d1", title: "Bạch Đằng 938", period: "Phong kiến", topic: "Quân sự", character: "Ngô Quyền", description: "Một dòng sông, một kế sách và bước ngoặt của nền tự chủ.", image: bachDangCard, imageAlt: heroSlides[0].imageAlt },
  { id: "d2", title: "Lời thề Mê Linh", period: "Cổ đại", topic: "Khởi nghĩa", character: "Trưng Trắc", description: "Cuộc nổi dậy lan từ Mê Linh tới khắp các quận huyện.", image: haiBaTrungCard, imageAlt: heroSlides[1].imageAlt },
  { id: "d3", title: "Điện Biên Phủ", period: "Hiện đại", topic: "Quân sự", character: "Người lính", description: "Những hồi ức nằm sau một chiến thắng mang tầm thế giới.", image: dienBienPhuCard, imageAlt: heroSlides[2].imageAlt },
  { id: "d4", title: "Cánh cửa Đổi Mới", period: "Hiện đại", topic: "Đời sống", character: "Người Hà Nội", description: "Sự chuyển mình được kể bằng ký ức phố phường và gia đình.", image: doiMoiCard, imageAlt: heroSlides[3].imageAlt },
];

export const citations: Citation[] = [
  { id: "c1", title: "Đại Việt sử ký toàn thư", author: "Ngô Sĩ Liên và các sử thần triều Lê", episode: "Bạch Đằng 938, tập 3", href: "https://hannom.vass.gov.vn" },
  { id: "c2", title: "Lịch sử Việt Nam, tập 1", author: "Viện Sử học", episode: "Lời thề Mê Linh, tập 1", href: "https://vienhanlamkhxh.vass.gov.vn" },
  { id: "c3", title: "Điện Biên Phủ, điểm hẹn lịch sử", author: "Võ Nguyên Giáp", episode: "Qua lòng chảo Điện Biên, tập 4", href: "https://nxbctqg.org.vn" },
];
