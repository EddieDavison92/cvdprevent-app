const BASE_URL = 'https://api.cvdprevent.nhs.uk';
const DEFAULT_REVALIDATE_SECONDS = 3600;

interface BrowserCacheEntry<T> {
  data: T;
  expiresAt: number;
}

const pendingRequests = new Map<string, Promise<unknown>>();

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Validates that an API response has the expected shape.
 * Checks that a required key exists and is an array (for list endpoints)
 * or an object (for single-item endpoints).
 */
function validateResponse<T>(data: unknown, expectedKey?: string): T {
  if (data === null || data === undefined) {
    throw new ApiError(0, 'API returned empty response');
  }

  if (typeof data !== 'object') {
    throw new ApiError(0, `API returned unexpected type: ${typeof data}`);
  }

  // Warn on missing keys but don't throw — the site should degrade gracefully.
  // Breaking changes will surface naturally when accessing the missing property,
  // and error boundaries will catch them.
  if (expectedKey && !(expectedKey in (data as Record<string, unknown>))) {
    console.warn(`[API] Response missing expected key: "${expectedKey}"`);
  }

  return data as T;
}

export async function fetchApi<T>(endpoint: string, expectedKey?: string): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    next: {
      revalidate: DEFAULT_REVALIDATE_SECONDS,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return validateResponse<T>(data, expectedKey);
}

/**
 * Fetch via the app's own relay (/api/cvdprevent), which filters rawDataJSON
 * rows server-side and is CDN-cached. Browser only (relative URL).
 */
export async function fetchRelayApi<T>(endpoint: string, expectedKey?: string): Promise<T> {
  const response = await fetch(`/api/cvdprevent${endpoint}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return validateResponse<T>(data, expectedKey);
}

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readBrowserCache<T>(cacheKey: string): T | null {
  if (!canUseBrowserStorage()) return null;

  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;

    const entry = JSON.parse(raw) as BrowserCacheEntry<T>;
    if (!entry || typeof entry.expiresAt !== 'number' || entry.expiresAt <= Date.now()) {
      window.localStorage.removeItem(cacheKey);
      return null;
    }

    return entry.data;
  } catch {
    window.localStorage.removeItem(cacheKey);
    return null;
  }
}

function writeBrowserCache<T>(cacheKey: string, data: T, ttlMs: number) {
  if (!canUseBrowserStorage()) return;

  try {
    const entry: BrowserCacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
    };
    window.localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    // Ignore quota/storage errors so network fetch remains the fallback.
  }
}

export async function fetchApiWithBrowserCache<T>(
  endpoint: string,
  expectedKey: string | undefined,
  options: {
    cacheKey: string;
    ttlMs: number;
  }
): Promise<T> {
  const cached = readBrowserCache<T>(options.cacheKey);
  if (cached) return cached;

  const existingRequest = pendingRequests.get(options.cacheKey) as Promise<T> | undefined;
  if (existingRequest) return existingRequest;

  const request = fetchApi<T>(endpoint, expectedKey)
    .then((data) => {
      writeBrowserCache(options.cacheKey, data, options.ttlMs);
      return data;
    })
    .finally(() => {
      pendingRequests.delete(options.cacheKey);
    });

  pendingRequests.set(options.cacheKey, request);
  return request;
}

export async function fetchApiNoCache<T>(endpoint: string, expectedKey?: string): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return validateResponse<T>(data, expectedKey);
}
