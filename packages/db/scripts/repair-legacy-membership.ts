import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../src/client";

const database = new URL(process.env.DATABASE_URL ?? "");
if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)) {
  throw new Error("This repair is limited to a local development database.");
}

const migration = "20261112120000_membership";
const legacySchema = "premium_legacy_20261118";
const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'membership_plans'
`;
if (columns.some(({ column_name }) => column_name === "code") || !columns.some(({ column_name }) => column_name === "created_by_id")) {
  throw new Error("Expected the legacy membership schema. No changes applied.");
}
const sourceSql = readFileSync(resolve(import.meta.dir, "../prisma/migrations", migration, "migration.sql"), "utf8")
  .replaceAll('ADD COLUMN "is_premium"', 'ADD COLUMN IF NOT EXISTS "is_premium"');

try {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`CREATE SCHEMA "${legacySchema}"`);
    for (const table of ["membership_payment_orders", "memberships", "membership_plans"]) {
      await tx.$executeRawUnsafe(`ALTER TABLE public."${table}" SET SCHEMA "${legacySchema}"`);
    }
    for (const statement of sourceSql.split(";").map((sql) => sql.trim()).filter(Boolean)) {
      await tx.$executeRawUnsafe(statement);
    }
    await tx.$executeRawUnsafe(`
      INSERT INTO public.membership_plans
        (id, code, name, price_vnd, duration_days, is_purchasable, is_active, sort_order, created_at, updated_at)
      SELECT id, replace(id::text, '-', ''), name, price_vnd, 30, false, is_active, sort_order, created_at, updated_at
      FROM "${legacySchema}".membership_plans
    `);
    await tx.$executeRawUnsafe(`
      INSERT INTO public.membership_orders
        (id, user_id, plan_id, plan_code_snapshot, plan_name_snapshot, price_vnd, duration_days,
         transfer_content, status, paid_at, bank_transaction_id, admin_note, created_at, updated_at)
      SELECT id, user_id, plan_id, replace(plan_id::text, '-', ''), plan_name, amount_vnd,
        GREATEST(term_months * 30, 1), replace(id::text, '-', ''),
        (CASE WHEN status::text = 'PAID' THEN 'paid'
              WHEN status::text = 'PENDING' AND expires_at > now() THEN 'pending' ELSE 'rejected' END)::membership_order_status,
        paid_at, provider_transaction_ref,
        'Imported legacy payment order; original preserved in premium_legacy_20261118',
        created_at, updated_at
      FROM "${legacySchema}".membership_payment_orders
    `);
    // Legacy manually managed periods have no order relation. Preserve them with
    // zero-value administrative orders, keeping their exact access dates.
    await tx.$executeRawUnsafe(`
      INSERT INTO public.membership_orders
        (id, user_id, plan_id, plan_code_snapshot, plan_name_snapshot, price_vnd, duration_days,
         transfer_content, status, paid_at, admin_note, created_at, updated_at)
      SELECT id, user_id, plan_id, replace(plan_id::text, '-', ''), plan_name, 0,
        GREATEST(ceil(extract(epoch FROM (expires_at - starts_at)) / 86400)::integer, 1),
        replace(id::text, '-', ''), 'paid', starts_at,
        'Imported legacy membership; original preserved in premium_legacy_20261118', created_at, updated_at
      FROM "${legacySchema}".memberships
    `);
    await tx.$executeRawUnsafe(`
      INSERT INTO public.memberships
        (id, user_id, plan_id, order_id, price_vnd, duration_days, starts_at, expires_at, revoked_at, revoke_reason, created_at)
      SELECT id, user_id, plan_id, id, 0,
        GREATEST(ceil(extract(epoch FROM (expires_at - starts_at)) / 86400)::integer, 1),
        starts_at, expires_at,
        CASE WHEN status::text IN ('REVOKED', 'CANCELLED') THEN updated_at ELSE NULL END,
        CASE WHEN status::text IN ('REVOKED', 'CANCELLED') THEN 'Imported legacy revocation' ELSE NULL END, created_at
      FROM "${legacySchema}".memberships
    `);
    const counts = await tx.$queryRaw<Array<{ preserved: boolean }>>`
      SELECT
        (SELECT count(*) FROM public.memberships) =
        (SELECT count(*) FROM premium_legacy_20261118.memberships) AS preserved
    `;
    if (!counts[0]?.preserved) throw new Error("Membership preservation check failed.");
  }, { timeout: 30_000 });

  for (const args of [
    ["migrate", "resolve", "--applied", migration],
    ["migrate", "deploy"],
  ]) {
    const result = Bun.spawnSync([process.execPath, "run", "prisma", ...args], {
      cwd: resolve(import.meta.dir, ".."), env: process.env, stdout: "inherit", stderr: "inherit",
    });
    if (result.exitCode) throw new Error(`Prisma ${args.join(" ")} failed. Legacy data remains preserved.`);
  }
  await prisma.$executeRawUnsafe(`
    UPDATE public.membership_plans p SET benefits =
      CASE WHEN jsonb_typeof(old.benefits) = 'array'
        THEN COALESCE((SELECT string_agg(value, E'\\n') FROM jsonb_array_elements_text(old.benefits)), '')
        ELSE old.benefits::text END
    FROM "${legacySchema}".membership_plans old WHERE old.id = p.id
  `);
  console.log("Membership schema repaired. Original tables preserved in " + legacySchema + ".");
} finally {
  await prisma.$disconnect();
}
