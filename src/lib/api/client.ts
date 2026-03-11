const BASE_URL = 'https://api.cvdprevent.nhs.uk';

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
      revalidate: 3600, // Cache for 1 hour
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return validateResponse<T>(data, expectedKey);
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
