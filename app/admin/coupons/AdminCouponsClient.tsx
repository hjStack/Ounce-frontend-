"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "../AdminShell";
import { useToast } from "../../../components/ToastContext";
import {
  couponStatusLabel,
  formatCouponBenefit,
  formatCouponCondition,
  formatCouponDate,
  getCouponId,
} from "../../../lib/coupons";
import type { Coupon, PageResponse } from "../../../types/api";
import { apiFetch } from "@/lib/api";

type AdminCoupon = Coupon & {
  memberId?: number;
  memberName?: string;
  memberEmail?: string;
};

type CouponResponse = PageResponse<AdminCoupon> & {
  coupons?: AdminCoupon[];
  data?: AdminCoupon[];
};

const INITIAL_FORM = {
  name: "",
  discountType: "FIXED",
  discountAmount: "",
  maxDiscountAmount: "",
  minOrderAmount: "",
  expiresAt: "",
};

const FILTERS = [
  { key: "ALL", label: "전체" },
  { key: "AVAILABLE", label: "사용 가능" },
  { key: "INACTIVE", label: "비활성" },
  { key: "USED", label: "사용 완료" },
  { key: "EXPIRED", label: "기간 만료" },
];

function readCoupons(data: CouponResponse | AdminCoupon[]) {
  if (Array.isArray(data)) return data;
  return data.content ?? data.coupons ?? data.items ?? data.data ?? [];
}

function couponDate(coupon: AdminCoupon) {
  return formatCouponDate(coupon.expiresAt);
}

function couponDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

export default function AdminCouponsClient() {
  const { toast, confirm } = useToast();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingCouponId, setEditingCouponId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/admin/coupons", {
        credentials: "include",
      });
      if (response.status === 401 || response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) throw new Error("COUPON_FETCH_FAILED");
      setCoupons(readCoupons((await response.json()) as CouponResponse | AdminCoupon[]));
    } catch {
      toast("쿠폰 목록을 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  const visibleCoupons = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return coupons.filter((coupon) => {
      const matchesFilter = filter === "ALL" || coupon.status === filter;
      const searchable = `${coupon.name ?? ""} ${coupon.memberName ?? ""} ${coupon.memberEmail ?? ""}`.toLowerCase();
      return matchesFilter && (!query || searchable.includes(query));
    });
  }, [coupons, filter, keyword]);

  const updateField = (field: keyof typeof INITIAL_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveCoupon = async () => {
    const name = form.name.trim();
    const discountAmount = Number(form.discountAmount);
    if (!name || !Number.isFinite(discountAmount) || discountAmount <= 0) {
      toast("쿠폰명과 할인 금액을 입력해주세요.", "error");
      return;
    }

    setSaving(true);
    try {
      const isEditing = editingCouponId !== null;
      const response = await apiFetch(
        isEditing
          ? `/api/admin/coupons/${editingCouponId}`
          : "/api/admin/coupons",
        {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          discountType: form.discountType,
          discountAmount,
          maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
          minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
          expiresAt: form.expiresAt || null,
        }),
        },
      );
      if (!response.ok) throw new Error(isEditing ? "COUPON_UPDATE_FAILED" : "COUPON_CREATE_FAILED");
      setForm(INITIAL_FORM);
      setEditingCouponId(null);
      toast(isEditing ? "쿠폰이 수정되었습니다." : "쿠폰이 등록되었습니다.");
      await loadCoupons();
    } catch {
      toast(
        editingCouponId === null
          ? "쿠폰 등록에 실패했습니다. 관리자 쿠폰 API를 확인해주세요."
          : "쿠폰 수정에 실패했습니다. 관리자 쿠폰 API를 확인해주세요.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const editCoupon = (coupon: AdminCoupon) => {
    const id = getCouponId(coupon);
    if (!id) return;
    setEditingCouponId(id);
    setForm({
      name: coupon.name || "",
      discountType: coupon.discountType || "FIXED",
      discountAmount: coupon.discountAmount != null ? String(coupon.discountAmount) : "",
      maxDiscountAmount:
        coupon.maxDiscountAmount != null ? String(coupon.maxDiscountAmount) : "",
      minOrderAmount: coupon.minOrderAmount != null ? String(coupon.minOrderAmount) : "",
      expiresAt: couponDateInputValue(coupon.expiresAt),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingCouponId(null);
    setForm(INITIAL_FORM);
  };

  const removeCoupon = async (coupon: AdminCoupon) => {
    const id = getCouponId(coupon);
    if (!id) return;
    const ok = await confirm("쿠폰을 삭제하시겠습니까?", {
      kind: "delete",
      description: "이미 사용된 쿠폰은 삭제 대신 비활성화하는 것을 권장합니다.",
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/api/admin/coupons/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("COUPON_DELETE_FAILED");
      setCoupons((current) => current.filter((item) => getCouponId(item) !== id));
      toast("쿠폰이 삭제되었습니다.");
    } catch {
      toast("쿠폰 삭제에 실패했습니다.", "error");
    }
  };

  const deactivateCoupon = async (coupon: AdminCoupon) => {
    const id = getCouponId(coupon);
    if (!id) return;
    const ok = await confirm("쿠폰을 비활성화하시겠습니까?", {
      kind: "delete",
      description: "비활성화된 쿠폰은 더 이상 주문에 사용할 수 없습니다.",
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/api/admin/coupons/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "INACTIVE" }),
      });
      if (!response.ok) throw new Error("COUPON_DEACTIVATE_FAILED");
      setCoupons((current) =>
        current.map((item) =>
          getCouponId(item) === id ? { ...item, status: "INACTIVE" } : item,
        ),
      );
      toast("쿠폰이 비활성화되었습니다.");
    } catch {
      toast("쿠폰 비활성화에 실패했습니다. 관리자 쿠폰 API를 확인해주세요.", "error");
    }
  };

  return (
    <AdminShell active="/admin/coupons" title="쿠폰 관리">
      {forbidden ? (
        <div className="rounded-xl border border-red-100 bg-white p-8 text-center">
          <i className="ri-shield-keyhole-line mb-3 block text-4xl text-red-400" />
          <p className="text-sm font-semibold text-gray-800">관리자 권한이 필요한 화면입니다.</p>
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-bold text-gray-900">
                {editingCouponId === null ? "쿠폰 등록" : "쿠폰 수정"}
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                회원에게 발급할 할인 쿠폰을 {editingCouponId === null ? "등록" : "수정"}합니다.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Input label="쿠폰명" value={form.name} onChange={(value) => updateField("name", value)} placeholder="첫 구매 무료배송" />
              <label className="text-xs font-semibold text-gray-600">
                할인 유형
                <select value={form.discountType} onChange={(event) => updateField("discountType", event.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal text-gray-900 outline-none focus:border-primary-400">
                  <option value="FIXED">정액 할인</option>
                  <option value="PERCENT">정률 할인</option>
                </select>
              </label>
              <Input label="할인 금액/율" type="number" value={form.discountAmount} onChange={(value) => updateField("discountAmount", value)} placeholder={form.discountType === "PERCENT" ? "10" : "3000"} />
              <Input label="최대 할인 금액" type="number" value={form.maxDiscountAmount} onChange={(value) => updateField("maxDiscountAmount", value)} placeholder="정률 쿠폰만 입력" />
              <Input label="최소 주문 금액" type="number" value={form.minOrderAmount} onChange={(value) => updateField("minOrderAmount", value)} placeholder="0" />
              <Input label="만료일" type="date" value={form.expiresAt} onChange={(value) => updateField("expiresAt", value)} />
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => void saveCoupon()} disabled={saving} className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "저장 중..." : editingCouponId === null ? "쿠폰 등록" : "수정 저장"}
              </button>
              {editingCouponId !== null && (
                <button type="button" onClick={cancelEdit} disabled={saving} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  수정 취소
                </button>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 overflow-x-auto">
                {FILTERS.map((item) => (
                  <button key={item.key} type="button" onClick={() => setFilter(item.key)} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${filter === item.key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-800"}`}>
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                <i className="ri-search-line text-gray-400" />
                <input type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="쿠폰명, 회원명, 이메일 검색" className="min-w-0 bg-transparent text-sm outline-none" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr><th className="px-5 py-3">쿠폰</th><th className="px-5 py-3">혜택</th><th className="px-5 py-3">조건</th><th className="px-5 py-3">회원</th><th className="px-5 py-3">상태</th><th className="px-5 py-3">만료일</th><th className="px-5 py-3 text-right">관리</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? <tr><td colSpan={7} className="px-5 py-16 text-center text-gray-400">쿠폰 목록을 불러오는 중...</td></tr> : visibleCoupons.map((coupon) => (
                    <tr key={getCouponId(coupon)} className="text-gray-700">
                      <td className="px-5 py-4 font-semibold text-gray-900">{coupon.name || "이름 없는 쿠폰"}</td>
                      <td className="px-5 py-4 font-semibold text-primary-600">{formatCouponBenefit(coupon)}</td>
                      <td className="px-5 py-4 text-xs text-gray-500">{formatCouponCondition(coupon)}</td>
                      <td className="px-5 py-4 text-xs">{coupon.memberName || coupon.memberEmail || "전체 발급"}</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">{couponStatusLabel(coupon.status)}</span></td>
                      <td className="px-5 py-4 text-xs text-gray-500">{couponDate(coupon)}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => editCoupon(coupon)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">수정</button>
                          {coupon.status === "AVAILABLE" && (
                            <button type="button" onClick={() => void deactivateCoupon(coupon)} className="rounded-lg border border-amber-100 px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50">비활성화</button>
                          )}
                          <button type="button" onClick={() => void removeCoupon(coupon)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">삭제</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && visibleCoupons.length === 0 && <tr><td colSpan={7} className="px-5 py-16 text-center text-gray-400">조건에 맞는 쿠폰이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="text-xs font-semibold text-gray-600">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal text-gray-900 outline-none focus:border-primary-400" />
    </label>
  );
}
