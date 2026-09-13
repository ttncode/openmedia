import { describe, expect, it, vi } from 'vitest';
import { api, ApiRequestError } from './client';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('api client', () => {
  it('posts JSON and parses the response', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ title: 'Pho', formats: [] }));
    const info = await api.info('https://youtu.be/a');
    expect(info.title).toBe('Pho');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/info');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('content-type')).toBe(
      'application/json',
    );
  });

  it('raises typed errors with retry hints', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        { error: 'Too many requests.', code: 'rate_limited' },
        {
          status: 429,
          headers: { 'retry-after': '12', 'content-type': 'application/json' },
        },
      ),
    );
    await expect(api.jobs()).rejects.toMatchObject({
      status: 429,
      code: 'rate_limited',
      retryAfterSeconds: 12,
    });
  });

  it('maps network failures to api_unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('fetch failed'),
    );
    const error = await api.session().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect((error as ApiRequestError).code).toBe('api_unreachable');
  });

  it('resolves empty responses for deletes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    await expect(api.removeJob('abc')).resolves.toBeUndefined();
  });

  it('builds file urls', () => {
    expect(api.fileUrl('abc')).toBe('/api/file/abc');
    expect(api.fileUrl('abc', 1)).toBe('/api/file/abc/1');
  });
});
