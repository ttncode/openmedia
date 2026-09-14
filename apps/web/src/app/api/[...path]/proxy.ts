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
export const MAX_REQUEST_BYTES = 2 * 1024 * 1024;

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
  const contentLength = upstream.headers.get('content-length');
  if (contentLength !== null && !upstream.headers.has('content-encoding'))
    headers.set('content-length', contentLength);
  return headers;
}

function declaresOversizedBody(request: Request): boolean {
  return Number(request.headers.get('content-length')) > MAX_REQUEST_BYTES;
}

async function readLimitedBody(
  body: ReadableStream<Uint8Array>,
): Promise<Blob | null> {
  const reader = body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let received = 0;
  for (
    let chunk = await reader.read();
    !chunk.done;
    chunk = await reader.read()
  ) {
    received += chunk.value.byteLength;
    if (received > MAX_REQUEST_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(new Uint8Array(chunk.value));
  }
  return new Blob(chunks);
}

function payloadTooLarge(): Response {
  return Response.json(
    {
      error: 'The request is larger than the API accepts.',
      code: 'request_entity_too_large',
    },
    { status: 413 },
  );
}

export async function proxyToApi(
  request: Request,
  path: readonly string[],
  apiBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const incoming = METHODS_WITHOUT_BODY.has(request.method)
    ? null
    : request.body;
  if (incoming && declaresOversizedBody(request)) return payloadTooLarge();
  const body = incoming ? await readLimitedBody(incoming) : undefined;
  if (body === null) return payloadTooLarge();
  try {
    const upstream = await fetchImpl(
      buildUpstreamUrl(request.url, path, apiBaseUrl),
      {
        method: request.method,
        headers: forwardedRequestHeaders(request),
        body,
        signal: request.signal,
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
