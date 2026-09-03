"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "../AdminShell";
import { useToast } from "../../../components/ToastContext";
import { formatDate, hoursSince } from "../../../lib/date";
import type { PageResponse, Qna } from "../../../types/api";

const PAGE_SIZE = 10;
const SLA_HOURS = 24;

const STATUSES = [
    { key: "WAITING", label: "답변 대기" },
    { key: "ANSWERED", label: "답변 완료" },
    { key: "ALL", label: "전체" },
];

const TEMPLATES = [
    {
        label: "배송 지연",
        text: "문의 주신 주문의 배송 상태를 확인했습니다.\n\n현재 배송이 지연되어 도착이 늦어지고 있습니다. 확인되는 도착 예정 시점은 (  )입니다.\n\n불편을 드려 죄송합니다.",
    },
    {
        label: "상품 상태 확인",
        text: "알려주신 상품 상태를 확인했습니다.\n\n보내주신 내용 기준으로 (  ) 처리해 드리겠습니다. 추가로 확인이 필요한 사항이 있으면 이 문의에 이어서 남겨주세요.",
    },
    {
        label: "주문 취소·변경",
        text: "문의 주신 주문 건을 확인했습니다.\n\n주문 마감 전 건은 주문 내역에서 직접 취소하실 수 있고, 마감이 지난 건은 확인 후 개별로 안내드립니다.",
    },
    {
        label: "확인 후 회신",
        text: "문의 주셔서 감사합니다.\n\n말씀 주신 내용은 담당 확인이 필요해 조금 더 시간이 걸립니다. 확인되는 즉시 이 문의에 답변으로 알려드리겠습니다.",
    },
];

export default function AdminQnaClient() {
    const { toast, confirm } = useToast();
    const [status, setStatus] = useState("WAITING");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [items, setItems] = useState<Qna[]>([]);
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [forbidden, setForbidden] = useState(false);
    const [openId, setOpenId] = useState<number | null>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [waitingCount, setWaitingCount] = useState(0);
    const [answeredCount, setAnsweredCount] = useState(0);
    const [overdueCount, setOverdueCount] = useState(0);

    const query = useCallback((nextStatus: string, nextPage: number, size = PAGE_SIZE) => {
        const params = new URLSearchParams({ page: String(nextPage), size: String(size) });
        if (nextStatus !== "ALL") params.set("status", nextStatus);
        return `/api/admin/qna?${params.toString()}`;
    }, []);

    const loadStats = useCallback(async () => {
        try {
            const [waitingRes, answeredRes] = await Promise.all([
                apiFetch(query("WAITING", 0, 100), { credentials: "include" }),
                apiFetch(query("ANSWERED", 0, 1), { credentials: "include" }),
            ]);
            if (waitingRes.status === 401 || waitingRes.status === 403) {
                setForbidden(true);
                return;
            }
            if (waitingRes.ok) {
                const data = (await waitingRes.json()) as PageResponse<Qna>;
                const content = data.content ?? [];
                setWaitingCount(data.totalElements ?? content.length);
                setOverdueCount(content.filter((item) => hoursSince(item.createdAt) > SLA_HOURS).length);
            }
            if (answeredRes.ok) {
                const data = (await answeredRes.json()) as PageResponse<Qna>;
                setAnsweredCount(data.totalElements ?? data.content?.length ?? 0);
            }
        } catch {
            // 통계 실패는 목록 사용을 막지 않는다.
        }
    }, [query]);

    const loadItems = useCallback(
        async (nextStatus: string, nextPage: number) => {
            setLoading(true);
            try {
                const res = await apiFetch(query(nextStatus, nextPage), { credentials: "include" });
                if (res.status === 401 || res.status === 403) {
                    setForbidden(true);
                    return;
                }
                if (!res.ok) throw new Error("ADMIN_QNA_FAILED");
                const data = (await res.json()) as PageResponse<Qna>;
                setItems(data.content ?? data.items ?? []);
                setPage(data.number ?? data.page ?? nextPage);
                setTotalPages(data.totalPages ?? 1);
            } catch {
                toast("문의 목록을 불러오지 못했습니다.", "error");
            } finally {
                setLoading(false);
            }
        },
        [query, toast],
    );

    useEffect(() => {
        void loadStats();
        void loadItems(status, 0);
    }, [loadItems, loadStats, status]);

    const visible = useMemo(() => {
        const q = keyword.trim().toLowerCase();
        if (!q) return items;
        return items.filter((item) => `${item.title} ${item.content} ${item.memberName || ""} ${item.category || ""}`.toLowerCase().includes(q));
    }, [items, keyword]);

    const answer = async (item: Qna) => {
        const text = (answers[item.qnaId] || "").trim();
        if (text.length < 5) {
            toast("답변을 5자 이상 입력해주세요.", "error");
            return;
        }
        const ok = await confirm("답변을 등록하시겠습니까?", {
            description: "등록한 답변은 고객 화면에 바로 표시됩니다.",
        });
        if (!ok) return;

        try {
            const res = await apiFetch(`/api/admin/qna/${item.qnaId}/answer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ answer: text }),
            });
            if (!res.ok) {
                toast("답변 등록에 실패했습니다.", "error");
                return;
            }
            toast("답변이 등록되었습니다.");
            setAnswers((current) => ({ ...current, [item.qnaId]: "" }));
            await loadStats();
            await loadItems(status, page);
        } catch {
            toast("서버와의 통신에 실패했습니다.", "error");
        }
    };

    return (
        <AdminShell active="/admin/qna" title="문의 관리">
            {forbidden ? (
                <div className="rounded-xl border border-red-100 bg-white p-8 text-center">
                    <i className="ri-shield-keyhole-line mb-3 block text-4xl text-red-400" />
                    <p className="text-sm font-semibold text-gray-800">관리자 권한이 필요한 화면입니다.</p>
                    <p className="mt-1 text-xs text-gray-500">ADMIN 계정으로 로그인 후 다시 열어주세요.</p>
                </div>
            ) : (
                <>
                    <div className="mb-6 grid gap-3 sm:grid-cols-3">
                        <StatCard label="답변 대기" value={waitingCount} />
                        <StatCard label="1일 초과" value={overdueCount} danger={overdueCount > 0} />
                        <StatCard label="답변 완료" value={answeredCount} />
                    </div>

                    <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="border-b border-gray-100 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex gap-2 overflow-x-auto">
                                    {STATUSES.map((item) => (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => {
                                                setStatus(item.key);
                                                setOpenId(null);
                                            }}
                                            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                                                status === item.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-800"
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                                    <i className="ri-search-line text-gray-400" />
                                    <input
                                        type="search"
                                        value={keyword}
                                        onChange={(event) => setKeyword(event.target.value)}
                                        placeholder="제목, 내용, 회원명 검색"
                                        className="min-w-0 bg-transparent text-sm outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 p-4">
                            {loading && <div className="rounded-xl bg-gray-50 py-16 text-center text-sm text-gray-400">문의 목록을 불러오는 중...</div>}
                            {!loading &&
                                visible.map((item) => (
                                    <article key={item.qnaId} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                                        <button
                                            type="button"
                                            onClick={() => setOpenId(openId === item.qnaId ? null : item.qnaId)}
                                            className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                                    <StatusBadge status={item.status} />
                                                    {elapsedBadge(item)}
                                                    {item.category && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">{item.category}</span>}
                                                    <span className="text-[11px] text-gray-400">{formatDate(item.createdAt, true)}</span>
                                                    <span className="text-[11px] font-medium text-gray-600">{item.memberName || `회원 ${item.memberId}`}</span>
                                                    <span className="text-[11px] text-gray-300">#{item.qnaId}</span>
                                                </div>
                                                <p className="clamp-1 text-sm font-semibold text-gray-900">{item.title}</p>
                                            </div>
                                            <i className={`ri-arrow-down-s-line mt-1 shrink-0 text-lg text-gray-400 transition-transform ${openId === item.qnaId ? "rotate-180" : ""}`} />
                                        </button>

                                        {openId === item.qnaId && (
                                            <div className="px-4 pb-4">
                                                <p className="qna-body rounded-xl bg-gray-50 px-4 py-3.5 text-sm leading-relaxed text-gray-700">{item.content}</p>
                                                {item.status === "ANSWERED" ? (
                                                    <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50/70 px-4 py-3.5">
                                                        <div className="mb-2 flex items-center gap-2">
                                                            <span className="text-sm font-bold text-primary-600">A</span>
                                                            <span className="text-xs font-semibold text-primary-800">등록된 답변</span>
                                                            <span className="ml-auto text-[11px] text-primary-700/70">{formatDate(item.answeredAt || undefined, true)}</span>
                                                        </div>
                                                        <p className="qna-body text-sm leading-relaxed text-primary-900/90">{item.answer}</p>
                                                    </div>
                                                ) : (
                                                    <div className="mt-4 border-t border-gray-100 pt-4">
                                                        <div className="mb-2.5 flex flex-wrap items-center gap-2">
                                                            <span className="mr-1 text-xs font-semibold text-gray-500">자주 쓰는 답변</span>
                                                            {TEMPLATES.map((template) => (
                                                                <button
                                                                    key={template.label}
                                                                    type="button"
                                                                    onClick={() => setAnswers((current) => ({ ...current, [item.qnaId]: template.text }))}
                                                                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-primary-300 hover:text-primary-600"
                                                                >
                                                                    {template.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <textarea
                                                            value={answers[item.qnaId] || ""}
                                                            onChange={(event) => setAnswers((current) => ({ ...current, [item.qnaId]: event.target.value }))}
                                                            rows={5}
                                                            maxLength={2000}
                                                            placeholder="고객에게 그대로 보이는 답변입니다."
                                                            className="w-full resize-y rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-950 outline-none focus:border-primary-400"
                                                        />
                                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => void answer(item)}
                                                                className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-40"
                                                            >
                                                                답변 등록
                                                            </button>
                                                            <p className="text-xs text-gray-400">등록하면 고객 화면에 바로 표시됩니다.</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </article>
                                ))}

                            {!loading && visible.length === 0 && <div className="rounded-xl bg-gray-50 py-16 text-center text-sm text-gray-400">조건에 맞는 문의가 없습니다.</div>}
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                            <button
                                type="button"
                                onClick={() => void loadItems(status, Math.max(0, page - 1))}
                                disabled={page <= 0 || loading}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-40"
                            >
                                이전
                            </button>
                            <span className="text-xs text-gray-400">
                                {page + 1} / {Math.max(1, totalPages)}
                            </span>
                            <button
                                type="button"
                                onClick={() => void loadItems(status, page + 1)}
                                disabled={page + 1 >= totalPages || loading}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-40"
                            >
                                다음
                            </button>
                        </div>
                    </section>
                </>
            )}
        </AdminShell>
    );
}

function StatCard({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
    return (
        <div className={`rounded-xl border p-4 ${danger ? "border-red-200 bg-red-50" : "border-gray-100 bg-white"}`}>
            <p className="mb-1.5 text-xs text-gray-500">{label}</p>
            <p className={`text-xl font-bold leading-none tabular-nums ${danger ? "text-red-600" : "text-gray-950"}`}>{value}</p>
        </div>
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

function elapsedBadge(item: Qna) {
    if (item.status === "ANSWERED") return null;
    const hours = hoursSince(item.createdAt);
    if (hours <= SLA_HOURS) return null;
    const label = hours >= 24 ? `${Math.floor(hours / 24)}일 경과` : `${Math.floor(hours)}시간 경과`;
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
            <i className="ri-alarm-warning-line" />
            {label}
        </span>
    );
}
