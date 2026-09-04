import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { hasAdminAccess } from "./admin";
import type { Member } from "../types/api";

function backendUrl() {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081"
  ).replace(/\/$/, "");
}

async function cookieHeader() {
  const store = await cookies();
  return store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

async function requestCookieHeader() {
  return (await headers()).get("cookie") ?? (await cookieHeader());
}

async function sameOriginApiUrl(path: string) {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return null;

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}${path}`;
}

async function fetchMember(url: string, cookie: string) {
  try {
    const response = await fetch(url, {
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as Member;
  } catch {
    return null;
  }
}

async function memberFromAuthorizationCookie() {
  const token = (await cookies()).get("Ounce")?.value;
  if (!token) return null;

  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as {
      email?: unknown;
      role?: unknown;
      exp?: unknown;
    };
    if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now())
      return null;

    const email = typeof claims.email === "string" ? claims.email : "";
    const role = typeof claims.role === "string" ? claims.role : "";
    if (!email && !role) return null;

    return { email, role } satisfies Member;
  } catch {
    return null;
  }
}

export async function getCurrentMember() {
  const cookie = await requestCookieHeader();
  if (!cookie) return null;

  const sameOriginUrl = await sameOriginApiUrl("/api/members/me");
  if (sameOriginUrl) {
    const member = await fetchMember(sameOriginUrl, cookie);
    if (member) return member;
  }

  const directMember = await fetchMember(
    `${backendUrl()}/api/members/me`,
    cookie,
  );
  if (directMember) return directMember;

  return memberFromAuthorizationCookie();
}

export async function requireAdminOrNotFound() {
  const member = await getCurrentMember();
  if (!hasAdminAccess(member)) notFound();
  return member;
}
