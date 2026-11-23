const base = "https://redirect.invalid";
const unsafeCharacters = /[\\\u0000-\u001f\u007f]/;
const credentialParams = /^(?:access_token|refresh_token|token|authorization|dpop)$/i;

function isInternalPath(path: string | null): path is string {
  if (!path?.startsWith("/") || path.startsWith("//") || unsafeCharacters.test(path)) {
    return false;
  }

  try {
    const url = new URL(path, base);
    const decodedPathname = decodeURIComponent(url.pathname);
    if (
      url.origin !== base ||
      decodedPathname.startsWith("//") ||
      unsafeCharacters.test(decodedPathname) ||
      new URL(decodedPathname, base).pathname.startsWith("//")
    ) {
      return false;
    }

    for (const name of url.searchParams.keys()) {
      if (credentialParams.test(name)) return false;
    }
    for (const name of new URLSearchParams(url.hash.slice(1)).keys()) {
      if (credentialParams.test(name)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function sanitizeRedirect(path: string | null, fallback = "/"): string {
  if (isInternalPath(path)) return path;
  return isInternalPath(fallback) ? fallback : "/";
}
