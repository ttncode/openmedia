import type {
  CookieSummary,
  DownloadRequest,
  Job,
  MediaInfo,
  PlaylistInfo,
  RuntimeSettings,
  SessionInfo,
  StorageUsage,
} from './types';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterSeconds: number | null,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

const API_PREFIX = '/api';
const UNREACHABLE_STATUS = 0;

function jsonInit(method: string, body?: unknown): RequestInit {
  return body === undefined
    ? { method }
    : {
        method,
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
      };
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${API_PREFIX}${path}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...init,
    });
  } catch {
    throw new ApiRequestError(
      UNREACHABLE_STATUS,
      'api_unreachable',
      'The OpenMedia API is not reachable.',
      null,
    );
  }
}

async function errorFrom(response: Response): Promise<ApiRequestError> {
  const body: unknown = await response.json().catch(() => null);
  const record =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const retryAfter = Number(response.headers.get('retry-after'));
  return new ApiRequestError(
    response.status,
    typeof record.code === 'string' ? record.code : 'unknown_error',
    typeof record.error === 'string' ? record.error : response.statusText,
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
  );
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init);
  if (!response.ok) throw await errorFrom(response);
  return (await response.json()) as T;
}

async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  const response = await send(path, init);
  if (!response.ok) throw await errorFrom(response);
}

export const api = {
  session: (): Promise<SessionInfo> => requestJson('/session'),
  signIn: (password: string): Promise<void> =>
    requestVoid('/session', jsonInit('POST', { password })),
  signOut: (): Promise<void> => requestVoid('/session', { method: 'DELETE' }),
  info: (url: string): Promise<MediaInfo> =>
    requestJson('/info', jsonInit('POST', { url })),
  playlist: (url: string): Promise<PlaylistInfo> =>
    requestJson('/playlist', jsonInit('POST', { url })),
  download: (request: DownloadRequest): Promise<{ job_id: string; job: Job }> =>
    requestJson('/download', jsonInit('POST', request)),
  jobs: async (): Promise<Job[]> =>
    (await requestJson<{ jobs: Job[] }>('/jobs')).jobs,
  removeJob: (jobId: string): Promise<void> =>
    requestVoid(`/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' }),
  settings: (): Promise<RuntimeSettings> => requestJson('/settings'),
  updateSettings: (patch: Partial<RuntimeSettings>): Promise<RuntimeSettings> =>
    requestJson('/settings', jsonInit('PUT', patch)),
  storage: (): Promise<StorageUsage> => requestJson('/storage'),
  cookies: (): Promise<CookieSummary> => requestJson('/cookies'),
  uploadCookies: (file: File): Promise<CookieSummary> => {
    const body = new FormData();
    body.append('file', file);
    return requestJson('/cookies', { method: 'PUT', body });
  },
  removeCookies: (): Promise<void> =>
    requestVoid('/cookies', { method: 'DELETE' }),
  fileUrl: (jobId: string, index?: number): string =>
    `${API_PREFIX}/file/${encodeURIComponent(jobId)}${index === undefined ? '' : `/${index}`}`,
};
