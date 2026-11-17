import { AdminListeningReportSchema, type AdminListeningReport, type AdminListeningReportQuery } from "@repo/shared";
import { client } from "@/lib/client";
import { ApiError } from "@/lib/apiError";

export async function getListeningReport(query: AdminListeningReportQuery): Promise<AdminListeningReport> {
  const response = await client.api.admin.reports.listening.$get({ query });
  if (!response.ok) throw await ApiError.fromResponse(response);
  return AdminListeningReportSchema.parse(await response.json());
}
