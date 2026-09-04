let refreshing: Promise<boolean> | null = null;

const SKIP = [
  "/api/auth/refresh",
  "/api/members/login",
  "/api/members/me",
  "/api/members/signup",
];

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

export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  const opts: RequestInit = { credentials: "include", ...init };

  let res = await fetch(input, opts);

  if (res.status === 401 && !SKIP.some((p) => String(input).includes(p))) {
    const ok = await doRefresh();
    if (ok) {
      res = await fetch(input, opts);
    } else {
      window.location.href = "/login";
    }
  }

  return res;
}
