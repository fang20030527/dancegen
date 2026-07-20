import { cleanupCustomTemplates } from "@/lib/custom-templates/route-operations";
import {
  customTemplateErrorResponse,
  hasValidCronAuthorization,
} from "@/lib/custom-templates/route-guards";

export async function GET(request: Request) {
  if (!hasValidCronAuthorization(request.headers, process.env.CRON_SECRET)) {
    return Response.json(
      { code: "UNAUTHORIZED", message: "Valid cron authorization is required." },
      { status: 401 },
    );
  }

  try {
    return Response.json(await cleanupCustomTemplates());
  } catch (error) {
    return customTemplateErrorResponse(error);
  }
}
