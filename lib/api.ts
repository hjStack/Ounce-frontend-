let refreshing: Promise<boolean> | null = null;

const SKIP_REFRESH = [
  "/api/auth/refresh",
  "/api/members/login",
  "/api/members/signup",
];

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

async function doRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function apiFetch(input: RequestInfo | URL, init: ApiFetchInit = {}) {
  const { auth, ...fetchInit } = init;
  const opts: RequestInit = { credentials: "include", ...fetchInit };
  const url = requestUrl(input);
  const refreshOnUnauthorized =
    auth?.refreshOnUnauthorized ??
    !SKIP_REFRESH.some((path) => url.includes(path));
  const redirectOnUnauthorized = auth?.redirectOnUnauthorized ?? true;

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
