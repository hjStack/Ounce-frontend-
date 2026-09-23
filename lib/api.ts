let refreshing: Promise<boolean> | null = null;

const SKIP_REFRESH = [
  "/api/auth/refresh",
  "/api/members/login",
  "/api/members/signup",
];
const CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type ApiFetchInit = RequestInit & {
  auth?: {
    redirectOnUnauthorized?: boolean;
    refreshOnUnauthorized?: boolean;
  };
};

function requestUrl(input: RequestInfo | URL) {
  if (input instanceof Request) return input.url;
  return String(input);
}

function csrfCookie() {
  if (typeof document === "undefined") return "";

  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("XSRF-TOKEN="))
    ?.split("=")
    .slice(1)
    .join("=") ?? "";
}

function isSameOrigin(url: string) {
  if (typeof window === "undefined") return false;

  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

async function ensureCsrfCookie() {
  if (typeof window === "undefined" || csrfCookie()) return;

  try {
    await fetch("/api/csrf", {
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    // The backend may not expose the CSRF endpoint in local development.
  }
}

async function requestInitWithCsrf(
  input: RequestInfo | URL,
  init: RequestInit,
) {
  const url = requestUrl(input);
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (CSRF_METHODS.has(method) && isSameOrigin(url)) {
    await ensureCsrfCookie();
    const token = csrfCookie();
    if (token) headers.set("X-XSRF-TOKEN", decodeURIComponent(token));
  }

  return {
    ...init,
    headers,
  } satisfies RequestInit;
}

async function doRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = requestInitWithCsrf("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    })
      .then((init) => fetch("/api/auth/refresh", init))
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function apiFetch(input: RequestInfo | URL, init: ApiFetchInit = {}) {
  const { auth, ...fetchInit } = init;
  const url = requestUrl(input);
  const refreshOnUnauthorized =
    auth?.refreshOnUnauthorized ??
    !SKIP_REFRESH.some((path) => url.includes(path));
  const redirectOnUnauthorized = auth?.redirectOnUnauthorized ?? true;
  const opts = await requestInitWithCsrf(input, {
    credentials: "include",
    ...fetchInit,
  });

  let res = await fetch(input, opts);

  if (res.status === 401 && refreshOnUnauthorized) {
    const ok = await doRefresh();
    if (ok) {
      res = await fetch(input, opts);
    } else if (
      redirectOnUnauthorized &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      window.location.replace("/login");
    }
  }

  return res;
}
