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
        // If it's HTML, don't dump HTML tags into the user error
        if (text.includes('<html') || text.includes('<!DOCTYPE') || text.includes('The page')) {
          errorMsg = res.status === 404
            ? 'Endpoint not found or server is initializing. Please try again.'
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
