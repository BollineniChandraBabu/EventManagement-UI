/** Same rules as the backend (WishesUrls.java), so the form and the API agree. */
export const WISHES_URL_MAX_LENGTH = 500;

/** Returns an error message for an invalid link, or null when it is valid or empty. */
export function wishesUrlError(value: string | null | undefined): string | null {
  const url = (value ?? '').trim();
  if (!url) {
    return null; // optional: no link means the link feature is skipped
  }
  if (url.length > WISHES_URL_MAX_LENGTH) {
    return `The link must be at most ${WISHES_URL_MAX_LENGTH} characters.`;
  }
  if (/\s/.test(url) || /[\u0000-\u001f]/.test(url)) {
    return 'The link must not contain spaces.';
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'Enter a full web address, for example https://example.com/birthday.html';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'The link must start with http:// or https://';
  }
  if (!parsed.hostname) {
    return 'The link must contain a website address.';
  }
  if (parsed.username || parsed.password) {
    return 'The link must not contain a username or password.';
  }
  return null;
}
