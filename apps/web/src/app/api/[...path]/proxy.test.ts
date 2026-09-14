import { describe, expect, it, vi } from 'vitest';
import {
  buildUpstreamUrl,
  forwardedRequestHeaders,
  MAX_REQUEST_BYTES,
  proxyToApi,
} from './proxy';

function streamOf(size: number): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(size));
      controller.close();
    },
  });
}

describe('api proxy', () => {
  it('maps the path and query onto the API base url', () => {
    const url = buildUpstreamUrl(
      'http://localhost:8080/api/status/abc?x=1',
      ['status', 'abc'],
      'http://api:8080',
    );
    expect(url.toString()).toBe('http://api:8080/api/status/abc?x=1');
  });

  it('forwards host and protocol and drops hop-by-hop headers', () => {
    const request = new Request('http://media.local:8080/api/download', {
      method: 'POST',
      headers: {
        host: 'media.local:8080',
        connection: 'keep-alive',
        cookie: 'openmedia_session=1',
        origin: 'http://media.local:8080',
      },
    });
    const headers = forwardedRequestHeaders(request);
    expect(headers.get('x-forwarded-host')).toBe('media.local:8080');
    expect(headers.get('x-forwarded-proto')).toBe('http');
    expect(headers.get('cookie')).toBe('openmedia_session=1');
    expect(headers.get('connection')).toBeNull();
    expect(headers.get('host')).toBeNull();
  });

  it('streams the upstream response and keeps every set-cookie', async () => {
    const upstreamHeaders = new Headers({ 'content-type': 'application/json' });
    upstreamHeaders.append('set-cookie', 'a=1; Path=/');
    upstreamHeaders.append('set-cookie', 'b=2; Path=/');
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response('{"ok":true}', { status: 201, headers: upstreamHeaders }),
      );
    const response = await proxyToApi(
      new Request('http://localhost/api/session', {
        method: 'POST',
        body: '{}',
      }),
      ['session'],
      'http://api:8080',
      fetchImpl,
    );
    expect(response.status).toBe(201);
    expect(response.headers.getSetCookie()).toEqual([
      'a=1; Path=/',
      'b=2; Path=/',
    ]);
    expect(await response.text()).toBe('{"ok":true}');
    expect(fetchImpl.mock.calls[0][1].method).toBe('POST');
  });

  it('answers 502 when the API is down', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(new TypeError('connect ECONNREFUSED'));
    const response = await proxyToApi(
      new Request('http://localhost/api/jobs'),
      ['jobs'],
      'http://api:8080',
      fetchImpl,
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'The OpenMedia API is not reachable.',
      code: 'api_unreachable',
    });
  });

  it('rejects a declared body larger than the API accepts without calling it', async () => {
    const fetchImpl = vi.fn();
    const response = await proxyToApi(
      new Request('http://localhost/api/cookies', {
        method: 'PUT',
        headers: { 'content-length': String(MAX_REQUEST_BYTES + 1) },
        body: 'x',
      }),
      ['cookies'],
      'http://api:8080',
      fetchImpl,
    );
    expect(response.status).toBe(413);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects an undeclared body once it grows past the limit', async () => {
    const fetchImpl = vi.fn();
    const response = await proxyToApi(
      new Request('http://localhost/api/cookies', {
        method: 'PUT',
        body: streamOf(MAX_REQUEST_BYTES + 1),
        duplex: 'half',
      } as RequestInit),
      ['cookies'],
      'http://api:8080',
      fetchImpl,
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      code: 'request_entity_too_large',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('forwards a body within the limit and the abort signal', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null));
    const request = new Request('http://localhost/api/info', {
      method: 'POST',
      body: streamOf(MAX_REQUEST_BYTES),
      duplex: 'half',
    } as RequestInit);
    await proxyToApi(request, ['info'], 'http://api:8080', fetchImpl);
    const init = fetchImpl.mock.calls[0][1];
    expect(new Blob([init.body]).size).toBe(MAX_REQUEST_BYTES);
    expect(init.signal).toBe(request.signal);
  });

  it('keeps the upstream content length only for unencoded bodies', async () => {
    const plain = await proxyToApi(
      new Request('http://localhost/api/file/j'),
      ['file', 'j'],
      'http://api:8080',
      vi
        .fn()
        .mockResolvedValue(
          new Response('abc', { headers: { 'content-length': '3' } }),
        ),
    );
    expect(plain.headers.get('content-length')).toBe('3');
    const encoded = await proxyToApi(
      new Request('http://localhost/api/file/j'),
      ['file', 'j'],
      'http://api:8080',
      vi.fn().mockResolvedValue(
        new Response('abc', {
          headers: { 'content-length': '3', 'content-encoding': 'gzip' },
        }),
      ),
    );
    expect(encoded.headers.get('content-length')).toBeNull();
  });
});
