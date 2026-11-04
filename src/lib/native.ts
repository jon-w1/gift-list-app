/**
 * Native app shell bridge (future Expo wrapper).
 *
 * The website must work fully without the shell. When it's running inside the
 * shell, the shell injects `window.ReactNativeWebView` and appends
 * "GiftListsApp/<version>" to the user agent, and the site can opt into extras
 * (push notifications, native share sheet). Nothing may *depend* on these.
 */
declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
  }
}

export function isNativeShell() {
  return typeof window !== "undefined" && (!!window.ReactNativeWebView || /GiftListsApp\//.test(navigator.userAgent));
}

export function postToShell(type: string, payload: unknown = {}) {
  if (typeof window === "undefined" || !window.ReactNativeWebView) return false;
  window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
  return true;
}

/** Share a link: native shell → Web Share API → copy to clipboard. */
export async function shareLink(url: string, text: string): Promise<"shared" | "copied" | "failed"> {
  if (postToShell("share", { url, text })) return "shared";
  try {
    if (navigator.share) {
      await navigator.share({ url, text });
      return "shared";
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return "failed";
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
