"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "../AdminShell";
import { useToast } from "../../../components/ToastContext";
import { formatDate } from "../../../lib/date";
import type { PageResponse, PointHistory } from "../../../types/api";
import { apiFetch } from "@/lib/api";

type AdminPointHistory = PointHistory & {
  memberId?: number;
  name?: string | null;
  memberName?: string | null;
  memberEmail?: string | null;
  typeDescription?: string | null;
};

type PointHistoryResponse = PageResponse<AdminPointHistory> & {
  histories?: AdminPointHistory[];
  pointHistories?: AdminPointHistory[];
  data?: AdminPointHistory[];
};

const PAGE_SIZE = 20;

function readHistories(data: PointHistoryResponse | AdminPointHistory[]) {
  if (Array.isArray(data)) return data;
  return data.content ?? data.histories ?? data.pointHistories ?? data.data ?? [];
}

function historyLabel(history: AdminPointHistory) {
  return history.description || history.typeDescription || history.type || "포인트 변동";
}

export default function AdminPointsClient() {
  const { toast } = useToast();
  const [histories, setHistories] = useState<AdminPointHistory[]>([]);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const loadHistories = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        size: String(PAGE_SIZE),
      });
      const response = await apiFetch(`/api/points/admin/histories?${params.toString()}`, {
        credentials: "include",
      });
      if (response.status === 401 || response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) throw new Error("ADMIN_POINTS_FAILED");
      const data = (await response.json()) as PointHistoryResponse | AdminPointHistory[];
      const nextHistories = readHistories(data);
      setHistories(nextHistories);
      if (Array.isArray(data)) {
        setPage(nextPage);
        setTotalPages(1);
        setTotalElements(nextHistories.length);
      } else {
        setPage(data.number ?? data.page ?? nextPage);
        setTotalPages(data.totalPages ?? 1);
        setTotalElements(data.totalElements ?? nextHistories.length);
      }
    } catch {
      toast("포인트 내역을 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadHistories(0);
  }, [loadHistories]);

  const visibleHistories = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return histories;
    return histories.filter((history) =>
      `${history.memberId ?? ""} ${history.name ?? ""} ${history.memberName ?? ""} ${history.memberEmail ?? ""} ${historyLabel(history)}`
        .toLowerCase()
        .includes(query),
    );
  }, [histories, keyword]);

  const earned = histories.reduce((sum, history) => {
    const amount = Number(history.amount || 0);
    return sum + (amount > 0 ? amount : 0);
  }, 0);
  const used = histories.reduce((sum, history) => {
    const amount = Number(history.amount || 0);
    return sum + (amount < 0 ? Math.abs(amount) : 0);
  }, 0);

  return (
    <AdminShell active="/admin/points" title="포인트 관리">
      {forbidden ? (
        <div className="rounded-xl border border-red-100 bg-white p-8 text-center">
          <i className="ri-shield-keyhole-line mb-3 block text-4xl text-red-400" />
          <p className="text-sm font-semibold text-gray-800">관리자 권한이 필요한 화면입니다.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="전체 변동 내역" value={`${totalElements.toLocaleString("ko-KR")}건`} />
            <StatCard label="현재 페이지 적립" value={`+${earned.toLocaleString("ko-KR")}P`} accent />
            <StatCard label="현재 페이지 사용·회수" value={`-${used.toLocaleString("ko-KR")}P`} danger={used > 0} />
          </div>

          <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">포인트 변동 내역</h2>
                <p className="mt-1 text-xs text-gray-500">회원별 포인트 적립·사용·회수 내역을 확인합니다.</p>
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                <i className="ri-search-line text-gray-400" />
                <input type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="회원명, 이메일, 사유 검색" className="min-w-0 bg-transparent text-sm outline-none" />
              </label>
            </div>

            {loading ? (
              <div className="py-16 text-center text-sm text-gray-400">포인트 내역을 불러오는 중...</div>
            ) : visibleHistories.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">조건에 맞는 포인트 내역이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                    <tr>
                      <th className="px-5 py-3">회원</th>
                      <th className="px-5 py-3">사유</th>
                      <th className="px-5 py-3">변동 포인트</th>
                      <th className="px-5 py-3">변동 후 잔액</th>
                      <th className="px-5 py-3">일시</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleHistories.map((history, index) => {
                      const amount = Number(history.amount || 0);
                      const balance = history.balanceAfter ?? history.balance;
                      return (
                        <tr key={history.pointHistoryId ?? history.id ?? index}>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-900">{history.name || history.memberName || `회원 #${history.memberId ?? "-"}`}</p>
                            {history.memberEmail && (
                              <p className="mt-0.5 text-xs text-gray-400">{history.memberEmail}</p>
                            )}
                          </td>
                          <td className="px-5 py-4 text-gray-600">{historyLabel(history)}</td>
                          <td className={`px-5 py-4 font-bold ${amount >= 0 ? "text-primary-600" : "text-red-500"}`}>{amount >= 0 ? "+" : ""}{amount.toLocaleString("ko-KR")}P</td>
                          <td className="px-5 py-4 text-gray-700">{balance == null ? "-" : `${Number(balance).toLocaleString("ko-KR")}P`}</td>
                          <td className="px-5 py-4 text-xs text-gray-500">{formatDate(history.createdAt || history.createdDate || undefined, true) || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <button type="button" onClick={() => void loadHistories(Math.max(0, page - 1))} disabled={page <= 0 || loading} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-40">이전</button>
              <span className="text-xs text-gray-400">{page + 1} / {Math.max(1, totalPages)}</span>
              <button type="button" onClick={() => void loadHistories(page + 1)} disabled={page + 1 >= totalPages || loading} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-40">다음</button>
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}

function StatCard({ label, value, accent = false, danger = false }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${danger ? "border-red-100 bg-red-50" : "border-gray-100 bg-white"}`}>
      <p className="mb-2 text-xs font-semibold text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${danger ? "text-red-600" : accent ? "text-primary-600" : "text-gray-950"}`}>{value}</p>
    </div>
  );
}
