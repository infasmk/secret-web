/**
 * Safe API Client & Response Handler for Ephemeral Messaging
 */

export async function parseResponseJson<T = any>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    let errorMsg = `Server error (${res.status})`;
    if (isJson) {
      try {
        const data = await res.json();
        errorMsg = data.error || data.message || errorMsg;
      } catch (_) {}
    } else {
      try {
        const text = await res.text();
        if (text.includes('<html') || text.includes('<!DOCTYPE') || text.includes('The page')) {
          errorMsg = res.status === 404
            ? 'Room or endpoint not found on server.'
            : `Server returned status ${res.status}. Please try again.`;
        } else if (text.trim().length > 0 && text.length < 200) {
          errorMsg = text.trim();
        }
      } catch (_) {}
    }
    throw new Error(errorMsg);
  }

  if (isJson) {
    try {
      return (await res.json()) as T;
    } catch (err: any) {
      throw new Error('Failed to parse server response. Please try again.');
    }
  }

  // Fallback if not JSON
  try {
    const text = await res.text();
    return text as unknown as T;
  } catch (err: any) {
    throw new Error('Invalid response from server.');
  }
}

/**
 * Fetch with automatic short retry for server startup / transient states
 */
export async function safeFetch(url: string, options?: RequestInit, retries = 2, delayMs = 600): Promise<Response> {
  try {
    const res = await fetch(url, options);
    // If server is currently booting (502 / 503 / 504), retry once
    if ((res.status === 502 || res.status === 503 || res.status === 504) && retries > 0) {
      await new Promise(r => setTimeout(r, delayMs));
      return safeFetch(url, options, retries - 1, delayMs * 1.5);
    }
    return res;
  } catch (err: any) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, delayMs));
      return safeFetch(url, options, retries - 1, delayMs * 1.5);
    }
    throw err;
  }
}

