import { describe, expect, it, vi } from 'vitest';
import { buildUpstreamUrl, forwardedRequestHeaders, proxyToApi } from './proxy';

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
});
