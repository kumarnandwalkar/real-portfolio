import fetch from 'node-fetch';

export async function checkHealth(url, timeoutMs = 2500) {
  if (!url) return { healthy: false, code: 0 };
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'manual', signal: controller.signal });
    clearTimeout(id);
    return { healthy: res.ok, code: res.status };
  } catch (e) {
    clearTimeout(id);
    return { healthy: false, error: e.message };
  }
}


