import { proxyToApi } from './proxy';

export const dynamic = 'force-dynamic';

const DEFAULT_API_URL = 'http://localhost:8081';

type ProxyContext = { params: Promise<{ path: string[] }> };

async function handle(
  request: Request,
  context: ProxyContext,
): Promise<Response> {
  const { path } = await context.params;
  return proxyToApi(request, path, process.env.API_URL ?? DEFAULT_API_URL);
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
