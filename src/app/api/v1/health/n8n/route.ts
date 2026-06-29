import { apiData } from "@/lib/api/errors";
import { checkN8nApiHealth, n8nConfigStatus } from "@/lib/api/n8n-health";
import { rateLimit, requestIp } from "@/lib/api/rate-limit";

export async function GET(request: Request) {
  const limited = rateLimit(`health:n8n:${requestIp(request)}`, {
    limit: 20,
    windowMs: 60_000,
  });

  if (limited) {
    return limited;
  }

  const config = n8nConfigStatus();
  const health = await checkN8nApiHealth();

  return apiData({
    ok: health.ok,
    configured: config.configured,
    n8n: health.configured
      ? {
          status: health.status,
          workflows_readable: health.ok,
          error: health.error,
        }
      : null,
    checked_at: new Date().toISOString(),
  });
}
