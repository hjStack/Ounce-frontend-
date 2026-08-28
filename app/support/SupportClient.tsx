"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../components/Footer";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/ToastContext";
import { formatDate } from "../../lib/date";
import type { PageResponse, Qna } from "../../types/api";

const PAGE_SIZE = 10;

const QNA_CATEGORIES = [
    { key: "order", label: "주문·결제", icon: "ri-shopping-bag-3-line" },
    { key: "delivery", label: "배송", icon: "ri-truck-line" },
    { key: "product", label: "상품·보관", icon: "ri-restaurant-line" },
    { key: "subscription", label: "구독", icon: "ri-calendar-check-line" },
    { key: "refund", label: "취소·환불", icon: "ri-arrow-go-back-line" },
    { key: "account", label: "회원·기타", icon: "ri-user-settings-line" },
];

const FAQS = [
    { cat: "order", q: "주문은 몇 시까지 하면 되나요?", a: "매일 밤 23:00까지 결제된 주문이 그날 회차에 포함됩니다. 23시를 넘긴 주문은 다음 회차로 넘어갑니다." },
    { cat: "order", q: "주문한 내용을 확인하고 싶어요.", a: "주문 내역에서 결제한 상품과 배송 상태를 확인할 수 있습니다.", href: "/orders", link: "주문 내역 보기" },
    { cat: "order", q: "비회원으로도 주문할 수 있나요?", a: "아니요. 주문·배송 조회와 1:1 문의 답변이 모두 계정에 연결되기 때문에 로그인이 필요합니다.", href: "/signup", link: "회원가입" },
    { cat: "delivery", q: "언제 도착하나요?", a: "수도권은 주문 다음 날 새벽 7시 도착이 기준입니다. 지역에 따라 배송 방식과 도착 시간이 달라질 수 있습니다." },
    { cat: "delivery", q: "새벽에 받으면 바로 냉장고에 넣어야 하나요?", a: "보냉 포장으로 배송하지만, 받으신 뒤에는 되도록 빨리 냉장 또는 냉동 보관해 주세요." },
    { cat: "product", q: "몇 인분인가요?", a: "모든 밀키트가 1인분 정량으로 소분되어 있습니다. 계량하거나 남은 재료를 처리할 일이 없도록 만든 구성입니다." },
    { cat: "product", q: "냉장인지 냉동인지 어디서 볼 수 있나요?", a: "상품 상세 페이지에 상품별로 표기됩니다.", href: "/products", link: "전체 밀키트 보기" },
    { cat: "subscription", q: "구독하면 메뉴는 누가 정하나요?", a: "고객이 직접 고릅니다. 이번 주에 받을 밀키트를 내 구독 화면에서 하나씩 바꿀 수 있습니다.", href: "/subscription", link: "내 구독으로 이동" },
    { cat: "subscription", q: "한 주만 쉬거나 해지할 수 있나요?", a: "내 구독 화면에서 한 주를 건너뛰거나 해지할 수 있도록 준비 중입니다." },
    { cat: "refund", q: "주문을 취소하고 싶어요.", a: "주문 마감 전까지는 주문 내역에서 직접 취소할 수 있습니다. 마감 후에는 1:1 문의로 주문번호를 남겨주세요.", href: "/orders", link: "주문 내역 보기" },
    { cat: "refund", q: "상품에 문제가 있었어요.", a: "받으신 상품의 상태가 이상하거나 구성품이 빠졌다면 1:1 문의로 주문번호와 함께 알려주세요." },
    { cat: "account", q: "탈퇴하고 싶어요.", a: "내 계정 화면 아래쪽에서 직접 탈퇴할 수 있습니다. 탈퇴하면 주문 내역·포인트·쿠폰·장바구니가 모두 삭제됩니다.", href: "/account", link: "내 계정으로 이동" },
    { cat: "account", q: "문의하면 답변은 얼마나 걸리나요?", a: "1:1 문의는 365일 접수하며, 영업일 기준 1일 내에 답변드립니다." },
];

type Tab = "faq" | "inquiry";

export default function SupportClient() {
    const router = useRouter();
    const { loading: authLoading, isAuthenticated } = useAuth();
    const { toast, confirm } = useToast();
    const [tab, setTab] = useState<Tab>("faq");
    const [faqCategory, setFaqCategory] = useState("all");
    const [faqKeyword, setFaqKeyword] = useState("");
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [qnas, setQnas] = useState<Qna[]>([]);
    const [qnaPage, setQnaPage] = useState(0);
    const [qnaLast, setQnaLast] = useState(true);
    const [qnaLoaded, setQnaLoaded] = useState(false);
    const [qnaLoading, setQnaLoading] = useState(false);
    const [openQna, setOpenQna] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [category, setCategory] = useState(QNA_CATEGORIES[0].label);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    const filteredFaqs = useMemo(() => {
        const keyword = faqKeyword.trim().toLowerCase();
        return FAQS.filter((faq) => {
            if (faqCategory !== "all" && faq.cat !== faqCategory) return false;
            if (!keyword) return true;
            return `${faq.q} ${faq.a} ${faq.cat}`.toLowerCase().includes(keyword);
        });
    }, [faqCategory, faqKeyword]);

    const loadQnas = useCallback(async (page = 0) => {
        setQnaLoading(true);
        try {
            const res = await fetch(`/api/qna/me?page=${page}&size=${PAGE_SIZE}`, { credentials: "include" });
            if (res.status === 401) {
                setQnas([]);
                setQnaLoaded(true);
                toast("로그인이 필요한 서비스입니다.", "error");
                router.push("/login");
                return;
            }
            if (!res.ok) throw new Error("QNA_FAILED");
            const data = (await res.json()) as PageResponse<Qna>;
            const nextItems = data.content ?? data.items ?? [];
            setQnas((current) => (page === 0 ? nextItems : [...current, ...nextItems]));
            setQnaPage(page);
            setQnaLast(data.last ?? (data.hasNext == null ? true : !data.hasNext));
            setQnaLoaded(true);
        } catch {
            setQnaLoaded(true);
            toast("문의 내역을 불러오지 못했습니다.", "error");
        } finally {
            setQnaLoading(false);
        }
    }, [router, toast]);

    useEffect(() => {
        if (tab !== "inquiry") return;
        if (authLoading) return;

        if (!isAuthenticated) {
            setQnas([]);
            setQnaPage(0);
            setQnaLast(true);
            setQnaLoaded(false);
            setOpenQna(null);
            setEditingId(null);
            setCategory(QNA_CATEGORIES[0].label);
            setTitle("");
            setContent("");
            return;
        }

        if (!qnaLoaded && !qnaLoading) void loadQnas(0);
    }, [authLoading, isAuthenticated, loadQnas, qnaLoaded, qnaLoading, tab]);

    const resetForm = () => {
        setEditingId(null);
        setCategory(QNA_CATEGORIES[0].label);
        setTitle("");
        setContent("");
    };

    const submitQna = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isAuthenticated) {
            toast("로그인 후 문의를 등록할 수 있습니다.", "error");
            return;
        }
        if (!title.trim()) {
            toast("문의 제목을 입력해주세요.", "error");
            return;
        }
        if (!content.trim()) {
            toast("문의 내용을 입력해주세요.", "error");
            return;
        }

        const url = editingId ? `/api/qna/${editingId}` : "/api/qna";
        const method = editingId ? "PATCH" : "POST";
        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ title: title.trim(), content: content.trim(), category }),
            });
            if (res.status === 401) {
                toast("로그인이 필요한 서비스입니다.", "error");
                router.push("/login");
                return;
            }
            if (!res.ok) {
                toast(editingId ? "답변 완료 문의는 수정할 수 없습니다." : "문의 등록에 실패했습니다.", "error");
                return;
            }
            toast(editingId ? "문의가 수정되었습니다." : "문의가 등록되었습니다.");
            resetForm();
            await loadQnas(0);
        } catch {
            toast("서버와의 통신에 실패했습니다.", "error");
        }
    };

    const startEdit = (item: Qna) => {
        if (item.status === "ANSWERED") {
            toast("답변 완료 문의는 수정할 수 없습니다.", "error");
            return;
        }
        setEditingId(item.qnaId);
        setCategory(item.category || QNA_CATEGORIES[0].label);
        setTitle(item.title);
        setContent(item.content);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const deleteQna = async (item: Qna) => {
        const ok = await confirm("문의를 삭제하시겠습니까?", { kind: "delete" });
        if (!ok) return;
        try {
            const res = await fetch(`/api/qna/${item.qnaId}`, { method: "DELETE", credentials: "include" });
            if (res.status === 401) {
                toast("로그인이 필요한 서비스입니다.", "error");
                router.push("/login");
                return;
            }
            if (!res.ok && res.status !== 204) {
                toast("답변 완료 문의는 삭제할 수 없습니다.", "error");
                return;
            }
            toast("문의가 삭제되었습니다.");
            if (editingId === item.qnaId) resetForm();
            await loadQnas(0);
        } catch {
            toast("서버와의 통신에 실패했습니다.", "error");
        }
    };

    return (
        <div className="bg-background-cream">
            <main className="min-h-screen px-4 pb-20 pt-28 md:px-8">
                <div className="mx-auto w-full max-w-5xl">
                    <div className="mb-7">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="h-px w-8 bg-primary-500" />
                            <span className="text-xs font-bold text-primary-500">SUPPORT</span>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground-950 md:text-3xl">고객센터</h1>
                        <p className="mt-1.5 text-sm text-foreground-500">자주 묻는 질문을 확인하고 로그인 후 나의 문의를 관리할 수 있습니다.</p>
                    </div>

                    <div className="mb-6 grid rounded-xl bg-background-100 p-1 sm:grid-cols-2">
                        <TabButton active={tab === "faq"} icon="ri-question-line" label="자주 묻는 질문" onClick={() => setTab("faq")} />
                        <TabButton active={tab === "inquiry"} icon="ri-chat-3-line" label="나의 문의" onClick={() => setTab("inquiry")} />
                    </div>

                    {tab === "faq" && (
                        <section>
                            <div className="mb-4 rounded-xl border border-background-200 bg-white p-4">
                                <div className="mb-3 flex items-center gap-2 rounded-lg border border-background-200 px-3 py-2.5">
                                    <i className="ri-search-line text-foreground-400" />
                                    <input
                                        type="search"
                                        value={faqKeyword}
                                        onChange={(event) => setFaqKeyword(event.target.value)}
                                        placeholder="궁금한 내용을 검색하세요"
                                        className="min-w-0 flex-1 bg-transparent text-sm text-foreground-900 outline-none placeholder:text-foreground-400"
                                    />
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {[{ key: "all", label: "전체", icon: "ri-grid-line" }, ...QNA_CATEGORIES].map((item) => (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => setFaqCategory(item.key)}
                                            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                                                faqCategory === item.key ? "bg-primary-500 text-white" : "border border-background-200 bg-white text-foreground-600 hover:border-primary-300"
                                            }`}
                                        >
                                            <i className={item.icon} /> {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {filteredFaqs.map((faq, index) => (
                                    <article key={`${faq.cat}-${faq.q}`} className="overflow-hidden rounded-xl border border-background-200 bg-white">
                                        <button
                                            type="button"
                                            onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                            className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-background-100/50"
                                        >
                                            <span className="mt-0.5 shrink-0 text-sm font-bold text-primary-500">Q</span>
                                            <span className="flex-1 break-keep text-sm font-semibold text-foreground-900">{faq.q}</span>
                                            <i className={`ri-arrow-down-s-line shrink-0 text-lg text-foreground-400 transition-transform ${openFaq === index ? "rotate-180" : ""}`} />
                                        </button>
                                        {openFaq === index && (
                                            <div className="px-4 pb-4 pl-11">
                                                <p className="break-keep text-sm leading-relaxed text-foreground-600">{faq.a}</p>
                                                {faq.href && (
                                                    <Link href={faq.href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700">
                                                        {faq.link} <i className="ri-arrow-right-s-line" />
                                                    </Link>
                                                )}
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                            {filteredFaqs.length === 0 && <p className="py-16 text-center text-sm text-foreground-400">해당하는 질문이 없습니다.</p>}
                        </section>
                    )}

                    {tab === "inquiry" && authLoading && <AuthNotice loading />}

                    {tab === "inquiry" && !authLoading && !isAuthenticated && <AuthNotice />}

                    {tab === "inquiry" && !authLoading && isAuthenticated && (
                        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
                            <form className="h-fit rounded-xl border border-background-200 bg-white p-5" onSubmit={submitQna}>
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-foreground-950">{editingId ? "문의 수정" : "문의 등록"}</h2>
                                    {editingId && (
                                        <button type="button" onClick={resetForm} className="text-xs font-medium text-foreground-400 hover:text-foreground-700">
                                            취소
                                        </button>
                                    )}
                                </div>
                                <label className="mb-1.5 block text-xs text-foreground-500">문의 유형</label>
                                <select
                                    value={category}
                                    onChange={(event) => setCategory(event.target.value)}
                                    className="mb-3 w-full rounded-lg border border-background-200 bg-background-50 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500"
                                >
                                    {QNA_CATEGORIES.map((item) => (
                                        <option key={item.key} value={item.label}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                                <label className="mb-1.5 block text-xs text-foreground-500">제목</label>
                                <input
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    maxLength={100}
                                    className="mb-3 w-full rounded-lg border border-background-200 bg-background-50 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500"
                                />
                                <label className="mb-1.5 block text-xs text-foreground-500">내용</label>
                                <textarea
                                    value={content}
                                    onChange={(event) => setContent(event.target.value)}
                                    rows={8}
                                    maxLength={2000}
                                    className="mb-4 w-full resize-y rounded-lg border border-background-200 bg-background-50 px-3.5 py-2.5 text-sm leading-relaxed outline-none focus:border-primary-500"
                                />
                                <button type="submit" className="w-full rounded-lg bg-primary-500 px-5 py-3 text-sm font-bold text-white hover:bg-primary-600">
                                    {editingId ? "수정하기" : "등록하기"}
                                </button>
                            </form>

                            <div className="flex flex-col gap-3">
                                {qnaLoading && qnas.length === 0 && <div className="rounded-xl border border-background-200 bg-white py-12 text-center text-sm text-foreground-400">문의 내역을 불러오는 중...</div>}
                                {qnas.map((item) => (
                                    <article key={item.qnaId} className="overflow-hidden rounded-xl border border-background-200 bg-white">
                                        <button
                                            type="button"
                                            onClick={() => setOpenQna(openQna === item.qnaId ? null : item.qnaId)}
                                            className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-background-100/60"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                                    <StatusBadge status={item.status} />
                                                    {item.category && <span className="rounded-full bg-background-100 px-2 py-0.5 text-[11px] text-foreground-500">{item.category}</span>}
                                                    <span className="text-[11px] text-foreground-400">{formatDate(item.createdAt, true)}</span>
                                                </div>
                                                <p className="clamp-1 text-sm font-semibold text-foreground-900">{item.title}</p>
                                            </div>
                                            <i className={`ri-arrow-down-s-line mt-1 shrink-0 text-lg text-foreground-400 transition-transform ${openQna === item.qnaId ? "rotate-180" : ""}`} />
                                        </button>
                                        {openQna === item.qnaId && (
                                            <div className="px-4 pb-4">
                                                <p className="qna-body rounded-xl bg-background-100/70 px-4 py-3.5 text-sm leading-relaxed text-foreground-700">{item.content}</p>
                                                {item.answer && (
                                                    <div className="mt-3 rounded-xl border border-primary-100 bg-primary-50/70 px-4 py-3.5">
                                                        <div className="mb-2 flex items-center gap-2">
                                                            <span className="text-sm font-bold text-primary-600">A</span>
                                                            <span className="text-xs font-semibold text-primary-800">답변</span>
                                                            <span className="ml-auto text-[11px] text-primary-700/70">{formatDate(item.answeredAt || undefined, true)}</span>
                                                        </div>
                                                        <p className="qna-body text-sm leading-relaxed text-primary-900/90">{item.answer}</p>
                                                    </div>
                                                )}
                                                {item.status !== "ANSWERED" && (
                                                    <div className="mt-3 flex gap-2">
                                                        <button type="button" onClick={() => startEdit(item)} className="rounded-lg border border-background-200 px-3 py-2 text-xs font-semibold text-foreground-600 hover:bg-background-100">
                                                            수정
                                                        </button>
                                                        <button type="button" onClick={() => void deleteQna(item)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">
                                                            삭제
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </article>
                                ))}
                                {!qnaLoading && qnas.length === 0 && (
                                    <div className="rounded-xl border border-background-200 bg-white py-16 text-center text-sm text-foreground-400">등록된 문의가 없습니다.</div>
                                )}
                                {!qnaLast && (
                                    <button
                                        type="button"
                                        onClick={() => void loadQnas(qnaPage + 1)}
                                        disabled={qnaLoading}
                                        className="rounded-lg border border-background-200 bg-white px-4 py-3 text-sm font-semibold text-foreground-700 hover:bg-background-100 disabled:opacity-50"
                                    >
                                        더 보기
                                    </button>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}

function AuthNotice({ loading = false }: { loading?: boolean }) {
    if (loading) {
        return (
            <section className="rounded-xl border border-background-200 bg-white px-5 py-16 text-center">
                <i className="ri-loader-4-line mb-3 block text-3xl text-primary-500" />
                <p className="text-sm font-semibold text-foreground-700">로그인 상태를 확인하는 중입니다.</p>
            </section>
        );
    }

    return (
        <section className="rounded-xl border border-background-200 bg-white px-5 py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                <i className="ri-lock-2-line text-2xl" />
            </div>
            <h2 className="text-lg font-bold text-foreground-950">로그인 후 확인할 수 있습니다</h2>
            <p className="mt-2 text-sm text-foreground-500">나의 문의 내역과 답변은 계정에 연결되어 있습니다.</p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                <Link href="/login" className="rounded-lg bg-primary-500 px-5 py-3 text-sm font-bold text-white hover:bg-primary-600">
                    로그인하기
                </Link>
                <Link href="/signup" className="rounded-lg border border-background-200 bg-white px-5 py-3 text-sm font-bold text-foreground-700 hover:bg-background-100">
                    회원가입
                </Link>
            </div>
        </section>
    );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                active ? "bg-white text-foreground-950 shadow-sm" : "text-foreground-500 hover:text-foreground-800"
            }`}
        >
            <i className={icon} /> {label}
        </button>
    );
}

function StatusBadge({ status }: { status: string }) {
    const answered = status === "ANSWERED";
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${answered ? "bg-primary-50 text-primary-700" : "bg-deal-100 text-deal-700"}`}>
            <i className={answered ? "ri-check-line" : "ri-time-line"} />
            {answered ? "답변 완료" : "답변 대기"}
        </span>
    );
}
