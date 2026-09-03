"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../components/Footer";
import { useToast } from "../../components/ToastContext";
import type { Member } from "../../types/api";

const LINKS = [
    { href: "/account", icon: "ri-user-line", title: "내 계정", desc: "회원 정보와 포인트" },
    { href: "/orders", icon: "ri-file-list-3-line", title: "주문 내역", desc: "주문 상태 확인" },
    { href: "/subscription", icon: "ri-calendar-check-line", title: "내 구독", desc: "이번 주 메뉴 변경" },
    { href: "/support", icon: "ri-customer-service-2-line", title: "고객센터", desc: "FAQ와 1:1 문의" },
];

export default function MypageClient() {
    const router = useRouter();
    const { toast } = useToast();
    const [member, setMember] = useState<Member | null>(null);

    useEffect(() => {
        apiFetch("/api/members/me", { credentials: "include" })
            .then((res) => {
                if (res.status === 401) {
                    toast("로그인이 필요한 페이지입니다.", "error");
                    router.push("/login");
                    return null;
                }
                return res.ok ? res.json() : null;
            })
            .then((data: Member | null) => setMember(data))
            .catch(() => toast("회원 정보를 불러오지 못했습니다.", "error"));
    }, [router, toast]);

    return (
        <div className="bg-background-cream">
            <main className="min-h-screen px-4 pb-20 pt-28 md:px-8">
                <div className="mx-auto w-full max-w-5xl">
                    <section className="mb-8">
                        <div className="mb-5 flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-xl font-bold text-white">
                                {(member?.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground-950">{member?.name || "사용자"}님</h1>
                                <p className="mt-1 text-sm text-foreground-500">{member?.email || "계정 정보를 확인 중입니다."}</p>
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Info label="등급" value={member?.grade || "BASIC"} />
                            <Info label="포인트" value={`${Number(member?.point || 0).toLocaleString("ko-KR")}P`} />
                        </div>
                    </section>

                    <section className="grid gap-3 sm:grid-cols-2">
                        {LINKS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center justify-between rounded-xl border border-background-200 bg-white p-5 transition-colors hover:border-primary-200"
                            >
                                <span className="flex items-center gap-4">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                                        <i className={`${item.icon} text-xl`} />
                                    </span>
                                    <span>
                                        <span className="block text-sm font-bold text-foreground-950">{item.title}</span>
                                        <span className="mt-1 block text-xs text-foreground-500">{item.desc}</span>
                                    </span>
                                </span>
                                <i className="ri-arrow-right-s-line text-xl text-foreground-300" />
                            </Link>
                        ))}
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-background-200 bg-white p-5">
            <p className="text-xs text-foreground-400">{label}</p>
            <p className="mt-1 text-xl font-bold text-foreground-950">{value}</p>
        </div>
    );
}
