import { prisma } from "./client";

async function main() {
  console.log("🌱 Starting database seeding for Su-Ky...");

  // 1. Periods
  const periodsData = [
    {
      name: "Thời Kỳ Hồng Bàng & Văn Lang",
      slug: "hong-bang-van-lang",
      startYear: -2879,
      endYear: -258,
      description: "Thời kỳ sơ khai dựng nước của các vua Hùng và cư dân Việt cổ.",
      orderIndex: 1,
    },
    {
      name: "Âu Lạc & An Dương Vương",
      slug: "au-lac-an-duong-vuong",
      startYear: -257,
      endYear: -179,
      description: "Thời kỳ An Dương Vương thống nhất Văn Lang - Âu Lạc, xây thành Cổ Loa.",
      orderIndex: 2,
    },
    {
      name: "Thời Kỳ Bắc Thuộc & Các Cuộc Khởi Nghĩa",
      slug: "bac-thuoc-khoi-nghia",
      startYear: -179,
      endYear: 938,
      description: "Hơn một thiên niên kỷ kiên cường đấu tranh giành độc lập (Hai Bà Trưng, Lý Bí, Mai Thúc Loan, Phùng Hưng).",
      orderIndex: 3,
    },
    {
      name: "Kỷ Nguyên Độc Lập: Ngô - Đinh - Tiền Lê",
      slug: "ngo-dinh-tien-le",
      startYear: 938,
      endYear: 1009,
      description: "Chiến thắng Bạch Đằng 938 mở ra kỷ nguyên độc lập tự chủ lâu dài cho dân tộc.",
      orderIndex: 4,
    },
    {
      name: "Triều Đại Nhà Lý",
      slug: "trieu-ly",
      startYear: 1009,
      endYear: 1225,
      description: "Dời đô về Thăng Long, mở mang văn hiến, bài thơ Nam Quốc Sơn Hà.",
      orderIndex: 5,
    },
    {
      name: "Triều Đại Nhà Trần",
      slug: "trieu-tran",
      startYear: 1225,
      endYear: 1400,
      description: "Hào khí Đông A, ba lần đại thắng quân Mông - Nguyên xâm lược.",
      orderIndex: 6,
    },
    {
      name: "Triều Đại Hậu Lê",
      slug: "trieu-hau-le",
      startYear: 1428,
      endYear: 1789,
      description: "Khởi nghĩa Lam Sơn đại thắng, thời kỳ hưng thịnh của Nho giáo và luật Hồng Đức.",
      orderIndex: 7,
    },
    {
      name: "Triều Đại Tây Sơn",
      slug: "trieu-tay-son",
      startYear: 1778,
      endYear: 1802,
      description: "Người anh hùng áo vải cờ đào Quang Trung đại phá quân Xiêm và 29 vạn quân Thanh.",
      orderIndex: 8,
    },
    {
      name: "Triều Đại Nhà Nguyễn",
      slug: "trieu-nguyen",
      startYear: 1802,
      endYear: 1945,
      description: "Thống nhất giang sơn từ Nam Quan đến Mũi Cà Mau, di sản văn hóa kinh thành Huế.",
      orderIndex: 9,
    },
  ];

  const periodMap = new Map<string, string>();

  for (const p of periodsData) {
    const period = await prisma.period.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
    periodMap.set(p.slug, period.id);
  }
  console.log(`✓ Seeded ${periodsData.length} historical periods`);

  // 2. Flagship Series
  const flagshipSeries = await prisma.series.upsert({
    where: { slug: "hanh-trinh-dung-nuoc" },
    update: {},
    create: {
      title: "Hành Trình Dựng Nước: Từ Văn Lang Đến Kỷ Nguyên Độc Lập",
      slug: "hanh-trinh-dung-nuoc",
      description: "Khám phá ngọn nguồn dân tộc qua những trang sử hào hùng từ thuở các Vua Hùng đặt nền móng đến cọc gỗ Bạch Đằng lịch sử.",
      coverImage: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop",
      category: "dung-nuoc",
      periodId: periodMap.get("hong-bang-van-lang"),
    },
  });

  const militarySeries = await prisma.series.upsert({
    where: { slug: "nhung-tran-thuy-chien-lung-lay" },
    update: {},
    create: {
      title: "Những Trận Thủy Chiến Lừng Lẫy Non Sông",
      slug: "nhung-tran-thuy-chien-lung-lay",
      description: "Bạch Đằng Giang ba lần nhuộm máu quân thù, Rạch Gầm - Xoài Mút vùi thây quân Xiêm.",
      coverImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop",
      category: "quan-su",
      periodId: periodMap.get("ngo-dinh-tien-le"),
    },
  });
  console.log(`✓ Seeded podcast series: '${flagshipSeries.title}' & '${militarySeries.title}'`);

  // 3. Episodes
  const ep1 = await prisma.episode.upsert({
    where: { slug: "bach-dang-giang-938-ngo-quyen" },
    update: {},
    create: {
      seriesId: militarySeries.id,
      periodId: periodMap.get("ngo-dinh-tien-le"),
      title: "Bạch Đằng 938: Ngô Quyền và Trận Đánh Chấm Dứt Nghìn Năm Bắc Thuộc",
      slug: "bach-dang-giang-938-ngo-quyen",
      audioUrl: "https://cdn.suky.vn/audio/episodes/bach-dang-938.mp3",
      durationSeconds: 1140, // 19 mins
      summary: "Mưu kế cọc ngầm độc đáo của Tiền Ngô Vương bẻ gãy ý chí xâm lược của Hoằng Tháo, chính thức mở toang cánh cửa độc lập cho muôn đời sau.",
      transcript: "[00:00] Mùa đông năm Mậu Tuất 938, dòng sông Bạch Đằng cuộn sóng đón đợi đoàn chiến thuyền Nam Hán...\n[05:12] Ngô Quyền cho chặt hàng vạn cây gỗ lim, vót nhọn đầu bịt sắt đóng ngầm dưới lòng sông...\n[12:30] Nước triều rút nhanh, thuyền giặc mắc cạn, vỡ tan tành trước đòn phục kích sấm sét...\n[18:00] Ý nghĩa nghìn năm của một chiến thắng bản lề.",
      orderNumber: 1,
      playCount: 1420,
    },
  });

  const ep2 = await prisma.episode.upsert({
    where: { slug: "khoi-nguon-van-lang-vua-hung" },
    update: {},
    create: {
      seriesId: flagshipSeries.id,
      periodId: periodMap.get("hong-bang-van-lang"),
      title: "Hồng Bàng Kỷ: Huyền Thoại Rồng Tiên và 18 Đời Vua Hùng",
      slug: "khoi-nguon-van-lang-vua-hung",
      audioUrl: "https://cdn.suky.vn/audio/episodes/hong-bang-ky.mp3",
      durationSeconds: 960, // 16 mins
      summary: "Giải mã nguồn cội Bách Việt, sự tích bánh chưng bánh giầy và nền văn minh lúa nước sông Hồng thời đại Hùng Vương.",
      transcript: "[00:00] Lần giở những trang đầu tiên của Đại Việt Sử Ký Toàn Thư...\n[04:15] Câu chuyện Lạc Long Quân và Âu Cơ - bản anh hùng ca về sự gắn kết cộng đồng...\n[10:20] Khảo cổ học Đông Sơn và những chiếc trống đồng huyền bí phản chiếu đời sống thời đại Hùng Vương.",
      orderNumber: 1,
      playCount: 2180,
    },
  });
  console.log("✓ Seeded sample podcast episodes with transcripts");

  // 4. Citations
  await prisma.citation.createMany({
    data: [
      {
        episodeId: ep1.id,
        bookTitle: "Đại Việt Sử Ký Toàn Thư",
        volume: "Ngoại Kỷ - Quyển V",
        chapter: "Tiền Ngô Vương",
        passage: "Mùa đông, tháng 12, vua đem quân đánh tan quân Hoằng Tháo ở sông Bạch Đằng, giết Hoằng Tháo...",
        quote: "Tiền Ngô Vương có thể lấy quân mới nhóm họp của đất Việt ta mà phá được trăm vạn quân của Lưu Hoằng Tháo, mở nước xưng vương, làm cho người phương Bắc không dám lại sang nữa.",
      },
      {
        episodeId: ep1.id,
        bookTitle: "Khâm Định Việt Sử Thông Giám Cương Mục",
        volume: "Tiền Biên - Quyển V",
        chapter: "Kỷ Nhà Ngô",
        passage: "Ngô Quyền nghe tin Hoằng Tháo sắp đến, bảo các tướng tá rằng: Hoằng Tháo là đứa trẻ dại, đem quân từ xa đến...",
        quote: "Nước thủy triều rút xuống rất gấp, thuyền của quân Nam Hán vướng phải cọc nhọn không thể chạy được.",
      },
      {
        episodeId: ep2.id,
        bookTitle: "Đại Việt Sử Ký Toàn Thư",
        volume: "Ngoại Kỷ - Quyển I",
        chapter: "Kỷ Hồng Bàng Thị",
        passage: "Xưa cháu ba đời của Viêm Đế họ Thần Nông là Đế Minh sinh ra Đế Nghi, sau nhân đi tuần phương Nam...",
        quote: "Họ Hồng Bàng dựng nước Văn Lang, truyền mười tám đời đều gọi là Hùng Vương.",
      },
    ],
    skipDuplicates: true,
  });
  console.log("✓ Seeded historical citations from official sources");

  // 5. Figures
  await prisma.figure.createMany({
    data: [
      {
        name: "Ngô Quyền",
        dynasty: "Nhà Ngô",
        birthYear: 898,
        deathYear: 944,
        biography: "Vị vua đầu tiên của nhà Ngô trong lịch sử Việt Nam, người anh hùng dân tộc đánh tan quân Nam Hán trên sông Bạch Đằng năm 938.",
        avatarUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop",
      },
      {
        name: "Trần Hưng Đạo (Trần Quốc Tuấn)",
        dynasty: "Nhà Trần",
        birthYear: 1228,
        deathYear: 1300,
        biography: "Quốc công Tiết chế, nhà quân sự thiên tài ba lần chỉ huy quân dân Đại Việt đánh bại đế quốc Mông - Nguyên hùng mạnh.",
        avatarUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop",
      },
      {
        name: "Lý Thường Kiệt",
        dynasty: "Nhà Lý",
        birthYear: 1019,
        deathYear: 1105,
        biography: "Danh tướng kiệt xuất thời Lý, người lãnh đạo cuộc chiến phòng thủ chống quân Tống bên bờ sông Như Nguyệt với bài thơ thần Nam Quốc Sơn Hà.",
        avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop",
      },
    ],
    skipDuplicates: true,
  });
  console.log("✓ Seeded historical figures");

  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
