"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useToast } from "../../../components/ToastContext";
import { apiFetch } from "@/lib/api";
import type { Product, ProductSliceResponse } from "../../../types/api";

type AdminTimeDeal = {
  timeDealId: number;
  productId: number;
  productName: string;
  discountRate: number;
  maxPurchaseLimit: number;
  startTime: string;
  endTime: string;
  status: string;
};

function dateTimeValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultDealTimes() {
  const start = new Date();
  if (start.getHours() >= 22) start.setDate(start.getDate() + 1);
  start.setHours(22, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 0, 0, 0);
  return { start: dateTimeValue(start), end: dateTimeValue(end) };
}

export default function AdminTimeDealClient() {
  const { toast, confirm } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [deals, setDeals] = useState<AdminTimeDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [times] = useState(defaultDealTimes);
  const [form, setForm] = useState({
    productId: "",
    discountRate: "30",
    maxPurchaseLimit: "50",
    startTime: times.start,
    endTime: times.end,
  });

  const loadDeals = async () => {
    try {
      const response = await apiFetch("/api/timedeal/admin", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("등록된 미드나이트 상품을 불러오지 못했습니다.");
      setDeals((await response.json()) as AdminTimeDeal[]);
    } catch (error) {
      toast(error instanceof Error ? error.message : "등록 목록을 불러오지 못했습니다.", "error");
    }
  };

  useEffect(() => {
    apiFetch("/api/products?page=0&size=100", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("상품 목록을 불러오지 못했습니다.");
        const data = (await response.json()) as ProductSliceResponse;
        setProducts(data.products ?? data.content ?? data.items ?? []);
      })
      .catch((error) => {
        setProducts([]);
        toast(error instanceof Error ? error.message : "상품 목록을 불러오지 못했습니다.", "error");
      })
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    void loadDeals();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.productId) {
      toast("미드나이트 상품을 선택해주세요.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch("/api/timedeal/admin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: Number(form.productId),
          discountRate: Number(form.discountRate),
          maxPurchaseLimit: Number(form.maxPurchaseLimit),
          startTime: form.startTime,
          endTime: form.endTime,
        }),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "미드나이트 상품 등록에 실패했습니다.");
      }
      toast("미드나이트 상품을 등록했습니다.");
      setForm((current) => ({ ...current, productId: "" }));
      await loadDeals();
    } catch (error) {
      toast(error instanceof Error ? error.message : "등록에 실패했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteDeal = async (deal: AdminTimeDeal) => {
    const ok = await confirm(`${deal.productName} 미드나이트 상품을 삭제할까요?`, {
      kind: "delete",
      description: "삭제하면 해당 미드나이트 일정과 한정 수량이 함께 제거됩니다.",
    });
    if (!ok) return;

    setDeletingId(deal.timeDealId);
    try {
      const response = await apiFetch(`/api/timedeal/admin/${deal.timeDealId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("미드나이트 상품 삭제에 실패했습니다.");
      toast("미드나이트 상품을 삭제했습니다.");
      await loadDeals();
    } catch (error) {
      toast(error instanceof Error ? error.message : "삭제에 실패했습니다.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-6 border-b border-gray-100 pb-5">
          <p className="text-xs font-bold tracking-[0.16em] text-indigo-600">MIDNIGHT SALE</p>
          <h2 className="mt-2 text-xl font-bold text-gray-900">미드나이트 상품 등록</h2>
          <p className="mt-1 text-sm text-gray-500">
            등록한 상품은 지정한 시작 시간에 미드나이트 페이지에 노출됩니다.
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-gray-700">상품</span>
            <select
              value={form.productId}
              onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
              disabled={loading || submitting}
              className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">상품을 선택해주세요</option>
              {products.map((product) => (
                <option key={product.productId} value={product.productId}>
                  {product.name} · {Number(product.basePrice || 0).toLocaleString("ko-KR")}원
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-semibold text-gray-700">할인율 (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={form.discountRate}
              onChange={(event) => setForm((current) => ({ ...current, discountRate: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-gray-700">한정 수량</span>
            <input
              type="number"
              min="1"
              value={form.maxPurchaseLimit}
              onChange={(event) => setForm((current) => ({ ...current, maxPurchaseLimit: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-gray-700">시작 시간</span>
            <input
              type="datetime-local"
              value={form.startTime}
              onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-gray-700">종료 시간</span>
            <input
              type="datetime-local"
              value={form.endTime}
              onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <div className="rounded-lg bg-indigo-50 p-4 text-xs leading-5 text-indigo-700 md:col-span-2">
            시작 시간에는 상품이 준비 상태로 저장되고, 스케줄러가 시작 시각에 자동으로 오픈합니다.
          </div>
          <button
            type="submit"
            disabled={submitting || loading}
            className="rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
          >
            {submitting ? "등록 중..." : "미드나이트 상품 등록"}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 md:px-7">
          <div>
            <h2 className="text-lg font-bold text-gray-900">등록된 미드나이트 상품</h2>
            <p className="mt-1 text-sm text-gray-500">등록된 타임딜의 일정과 진행 상태를 확인합니다.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadDeals()}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            새로고침
          </button>
        </div>
        {deals.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">등록된 미드나이트 상품이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                <tr>
                  <th className="px-5 py-3">상품</th>
                  <th className="px-5 py-3">할인</th>
                  <th className="px-5 py-3">한정 수량</th>
                  <th className="px-5 py-3">진행 시간</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {deals.map((deal) => (
                  <tr key={deal.timeDealId}>
                    <td className="px-5 py-3 font-semibold text-gray-900">{deal.productName}</td>
                    <td className="px-5 py-3 font-semibold text-indigo-600">{deal.discountRate}%</td>
                    <td className="px-5 py-3">{deal.maxPurchaseLimit.toLocaleString("ko-KR")}개</td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {deal.startTime.replace("T", " ")} ~ {deal.endTime.slice(11, 16)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                        {deal.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void deleteDeal(deal)}
                        disabled={deletingId === deal.timeDealId}
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        {deletingId === deal.timeDealId ? "삭제 중" : "삭제"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
