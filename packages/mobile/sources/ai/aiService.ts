/**
 * AI service — calls the local pi-mono proxy server.
 *
 * The proxy handles provider auth, model resolution, and API calls.
 * This client just sends a simple JSON payload and gets text back.
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function complete(
  serverUrl: string,
  provider: string,
  model: string,
  messages: Message[]
): Promise<string> {
  if (!serverUrl) throw new Error('AI server URL not configured');

  const url = `${serverUrl.replace(/\/$/, '')}/v1/complete`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider,
        model,
        messages,
        maxTokens: 1024,
      }),
    });
  } catch {
    throw new Error('Cannot reach AI server. Check WiFi or restart the proxy.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(data.error || `Server error ${res.status}`);
  }

  const data = await res.json();
  return data.text || '';
}
