const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'upgrade',
  'te',
  'trailer',
  'host',
  'content-length',
]);
const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);

export function buildUpstreamUrl(
  requestUrl: string,
  path: readonly string[],
  apiBaseUrl: string,
): URL {
  const upstream = new URL(
    `/api/${path.map(encodeURIComponent).join('/')}`,
    apiBaseUrl,
  );
  upstream.search = new URL(requestUrl).search;
  return upstream;
}

export function forwardedRequestHeaders(request: Request): Headers {
  const incoming = new URL(request.url);
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key)) headers.set(key, value);
  });
  headers.set('x-forwarded-host', request.headers.get('host') ?? incoming.host);
  headers.set(
    'x-forwarded-proto',
    request.headers.get('x-forwarded-proto') ??
      incoming.protocol.replace(':', ''),
  );
  return headers;
}

function responseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key) && key !== 'set-cookie')
      headers.set(key, value);
  });
  upstream.headers
    .getSetCookie()
    .forEach((cookie) => headers.append('set-cookie', cookie));
  return headers;
}

export async function proxyToApi(
  request: Request,
  path: readonly string[],
  apiBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const body = METHODS_WITHOUT_BODY.has(request.method)
    ? undefined
    : await request.arrayBuffer();
  try {
    const upstream = await fetchImpl(
      buildUpstreamUrl(request.url, path, apiBaseUrl),
      {
        method: request.method,
        headers: forwardedRequestHeaders(request),
        body,
        redirect: 'manual',
        cache: 'no-store',
      },
    );
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders(upstream),
    });
  } catch {
    return Response.json(
      { error: 'The OpenMedia API is not reachable.', code: 'api_unreachable' },
      { status: 502 },
    );
  }
}
