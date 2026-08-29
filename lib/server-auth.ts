import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { hasAdminAccess } from "./admin";
import type { Member } from "../types/api";

function backendUrl() {
    return (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081").replace(/\/$/, "");
}

async function cookieHeader() {
    const store = await cookies();
    return store
        .getAll()
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");
}

export async function getCurrentMember() {
    const cookie = await cookieHeader();
    if (!cookie) return null;

    try {
        const response = await fetch(`${backendUrl()}/api/members/me`, {
            headers: { Cookie: cookie },
            cache: "no-store",
        });
        if (!response.ok) return null;
        return (await response.json()) as Member;
    } catch {
        return null;
    }
}

export async function requireAdminOrNotFound() {
    const member = await getCurrentMember();
    if (!hasAdminAccess(member)) notFound();
    return member;
}
