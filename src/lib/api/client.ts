import { ApiError } from './errors';

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const json = await res.json();

  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = '/login';
      throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    throw new ApiError(
      json.error || 'Request failed',
      res.status,
      json.code || 'UNKNOWN'
    );
  }

  return json.data as T;
}
