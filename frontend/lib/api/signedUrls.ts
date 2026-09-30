/**
 * Artwork and label files are served from short-lived HMAC-signed URLs
 * (`…/artwork/:id/file?purpose=&exp=&sig=`); access tokens never go in URLs.
 */

/** True for a signed link that has expired or will within `marginMs`. Other URLs never expire. */
export function isExpiredSignedUrl(url: string, now = Date.now(), marginMs = 30_000): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url, "http://relative.invalid");
  } catch {
    return false;
  }
  const exp = Number(parsed.searchParams.get("exp"));
  if (!parsed.searchParams.has("sig") || !Number.isFinite(exp) || exp <= 0) return false;
  return exp * 1000 - now < marginMs;
}

/**
 * Starts a download from a freshly minted link. The API serves `download` links as
 * attachments, so navigating to one saves the file and leaves the page in place.
 */
export async function downloadSignedFile(mint: () => Promise<{ url: string }>): Promise<void> {
  const { url } = await mint();
  window.location.assign(url);
}
