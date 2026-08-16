/**
 * Utility for fetching endpoints hosted on platforms with cold-start / wake-up delays (e.g. Render / onrender.com free tier).
 * Render free instances sleep after 15 minutes of inactivity and take 30-60 seconds to wake up.
 * Standard fetch requests time out or fail immediately with network error or 502/503/504 gateway errors.
 * 
 * This function handles retries with extended timeouts and provides progress callbacks so the UI
 * can inform the user: "Az OnRender szerver ébresztése folyamatban (30-60 mp)...".
 */

export interface RenderWakeupStatus {
  attempt: number;
  maxRetries: number;
  message: string;
  isWakingUp: boolean;
}

export interface RenderWakeupFetchOptions {
  maxRetries?: number; // Default: 4 retries
  timeoutMs?: number; // Per attempt timeout (default: 45000 ms)
  retryDelayMs?: number; // Delay between retries (default: 5000 ms)
  onProgress?: (status: RenderWakeupStatus) => void;
}

export async function fetchWithRenderWakeup(
  url: string,
  options: RequestInit = {},
  wakeupOptions: RenderWakeupFetchOptions = {}
): Promise<Response> {
  const maxRetries = wakeupOptions.maxRetries ?? 4;
  const timeoutMs = wakeupOptions.timeoutMs ?? 45000;
  const retryDelayMs = wakeupOptions.retryDelayMs ?? 5000;

  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const isRetry = attempt > 1;

    if (wakeupOptions.onProgress) {
      wakeupOptions.onProgress({
        attempt,
        maxRetries,
        isWakingUp: isRetry,
        message: isRetry
          ? `⏳ Az OnRender szerver ébresztése folyamatban (Próbálkozás: ${attempt}/${maxRetries})... Kérjük várj!`
          : `🔍 Kérés küldése (${attempt}/${maxRetries})...`,
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Render returns 502, 503, or 504 while container is spinning up
      if ([502, 503, 504].includes(response.status)) {
        throw new Error(`Szerver indítása folyamatban (HTTP ${response.status})`);
      }

      if (response.ok) {
        if (wakeupOptions.onProgress) {
          wakeupOptions.onProgress({
            attempt,
            maxRetries,
            isWakingUp: false,
            message: '✅ Szerver elérhető, válasz megérkezett!',
          });
        }
        return response;
      }

      // If HTTP error other than 502/503/504 (e.g. 404), return it
      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      const isAbort = err?.name === 'AbortError';
      console.warn(`[RenderWakeup] Attempt ${attempt}/${maxRetries} failed for ${url}:`, isAbort ? 'Timeout' : err?.message || err);

      if (attempt < maxRetries) {
        // Wait before next retry attempt
        await new Promise((res) => setTimeout(res, retryDelayMs));
      }
    }
  }

  throw lastError || new Error('A szerver nem válaszolt a megadott időn belül.');
}
