import { prisma } from "./client";

async function main() {
  console.log("🌱 Database seeding for Su-Ky Auth...");

  // Seed default admin user if not exists
  const adminEmail = process.env.ADMIN_EMAIL || "admin@suky.vn";
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        id: "admin-default-id",
        name: "Su-Ky Administrator",
        email: adminEmail,
        emailVerified: true,
        role: "admin",
        banned: false,
      },
    });
    console.log(`✓ Seeded default admin user: ${admin.email} (${admin.id})`);
  } else {
    console.log(`✓ Admin user already exists: ${existingAdmin.email}`);
  }

  console.log("🎉 Database auth seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
