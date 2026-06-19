import { apiData } from "@/lib/api/errors";
import { rateLimit, requestIp } from "@/lib/api/rate-limit";

export async function GET(request: Request) {
  const limited = rateLimit(`health:${requestIp(request)}`, {
    limit: 60,
    windowMs: 60_000,
  });

  if (limited) {
    return limited;
  }

  return apiData({
    ok: true,
    service: "ai-native-crm",
    checked_at: new Date().toISOString(),
  });
}
