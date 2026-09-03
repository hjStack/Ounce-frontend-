"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../components/Footer";
import { useCart } from "../../components/CartContext";
import { useToast } from "../../components/ToastContext";
import { PRODUCT_PLACEHOLDER, won } from "../../lib/products";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "../../lib/shipping";
import {
  hasSubscriptionFreeShippingBenefit,
  pickCurrentSubscription,
  readSubscriptionList,
} from "../../lib/subscriptions";
import type { CartItem, SubscriptionResponse } from "../../types/api";
import { apiFetch } from "@/lib/api";

interface SelectableCartItem extends CartItem {
  selected: boolean;
}

export default function CartClient() {
  const router = useRouter();
  const { refresh } = useCart();
  const { toast, confirm } = useToast();
  const [items, setItems] = useState<SelectableCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState("00:00:00");
  const [urgent, setUrgent] = useState(false);
  const [pastCutoff, setPastCutoff] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(
    null,
  );
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const fetchMyCart = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/carts/items", {
        credentials: "include",
      });
      if (response.status === 401) {
        toast("로그인이 필요한 서비스입니다.", "error");
        window.setTimeout(() => router.push("/login"), 1000);
        return;
      }
      if (!response.ok) throw new Error("서버 데이터 로드 실패");
      const data = (await response.json()) as CartItem[];
      setItems(data.map((item) => ({ ...item, selected: true })));
    } catch {
      setItems([]);
      toast("장바구니를 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    void fetchMyCart();
  }, [fetchMyCart]);

  useEffect(() => {
    let ignore = false;
    setSubscriptionLoading(true);

    apiFetch("/api/subscriptions/me", { credentials: "include" })
      .then(async (response) => {
        if (
          response.status === 404 ||
          response.status === 401 ||
          response.status === 403
        )
          return null;
        if (!response.ok) throw new Error("SUBSCRIPTION_FAILED");
        return pickCurrentSubscription(await readSubscriptionList(response));
      })
      .then((data) => {
        if (!ignore) setSubscription(data);
      })
      .catch(() => {
        if (!ignore) setSubscription(null);
      })
      .finally(() => {
        if (!ignore) setSubscriptionLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const formatTime = (ms: number) => {
      const totalSeconds = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    const tick = () => {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setHours(23, 0, 0, 0);
      const isPast = now.getTime() >= cutoff.getTime();
      if (isPast) cutoff.setDate(cutoff.getDate() + 1);
      const left = cutoff.getTime() - now.getTime();
      setCountdown(formatTime(left));
      setUrgent(left < 2 * 60 * 60 * 1000);
      setPastCutoff(isPast);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const hasSubscriptionFreeShipping =
    hasSubscriptionFreeShippingBenefit(subscription);

  const summary = useMemo(() => {
    const selectedItems = items.filter((item) => item.selected);
    const totalItems = selectedItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const totalPrice = selectedItems.reduce(
      (sum, item) => sum + item.finalPrice * item.quantity,
      0,
    );
    const shipping =
      hasSubscriptionFreeShipping ||
      totalPrice >= FREE_SHIPPING_THRESHOLD ||
      totalPrice === 0
        ? 0
        : SHIPPING_FEE;
    return {
      selectedItems,
      selectedCount: selectedItems.length,
      totalItems,
      totalPrice,
      shipping,
      finalPrice: totalPrice + shipping,
    };
  }, [hasSubscriptionFreeShipping, items]);

  const updateQuantity = async (cartId: number, delta: number) => {
    const item = items.find((candidate) => candidate.cartId === cartId);
    if (!item) return;

    const targetQty = Math.max(1, Math.min(10, item.quantity + delta));
    if (targetQty === item.quantity) return;

    try {
      const response = await apiFetch(
        `/api/carts/${cartId}?quantity=${targetQty}`,
        {
          method: "PATCH",
          credentials: "include",
        },
      );

      if (!response.ok) {
        toast("수량 수정에 실패했습니다.", "error");
        return;
      }

      setItems((current) =>
        current.map((cartItem) =>
          cartItem.cartId === cartId
            ? { ...cartItem, quantity: targetQty }
            : cartItem,
        ),
      );
      await refresh();
    } catch {
      toast("서버와의 통신에 실패했습니다.", "error");
    }
  };

  const removeItems = async (targets: SelectableCartItem[]) => {
    if (targets.length === 0) {
      toast("삭제할 상품을 선택해주세요.", "error");
      return;
    }

    const ok = await confirm(
      targets.length === 1
        ? "선택하신 상품을 장바구니에서 뺄까요?"
        : `선택하신 ${targets.length}개의 상품을 삭제할까요?`,
      {
        kind: "delete",
        description: "삭제한 상품은 다시 상품 목록에서 담을 수 있습니다.",
      },
    );
    if (!ok) return;

    try {
      const results = await Promise.all(
        targets.map((item) =>
          apiFetch(`/api/carts/${item.cartId}`, {
            method: "DELETE",
            credentials: "include",
          }),
        ),
      );
      if (
        !results.every((response) => response.ok || response.status === 204)
      ) {
        toast("일부 상품 삭제에 실패했습니다.", "error");
      }
      const removed = new Set(targets.map((item) => item.cartId));
      setItems((current) =>
        current.filter((item) => !removed.has(item.cartId)),
      );
      await refresh();
      toast("상품이 삭제되었습니다.");
    } catch {
      toast("서버와의 통신에 실패했습니다.", "error");
    }
  };

  const handleCheckout = () => {
    if (summary.selectedItems.length === 0) {
      toast("상품을 선택해주세요.", "error");
      return;
    }
    sessionStorage.setItem(
      "ounce.checkout.selectedCartIds",
      JSON.stringify(summary.selectedItems.map((item) => item.cartId)),
    );
    router.push("/checkout");
  };

  if (!loading && items.length === 0) {
    return (
      <div className="bg-[#fcfbf9]">
        <main className="flex min-h-screen flex-col items-center justify-center px-4 py-32 pt-28">
          <div className="max-w-sm text-center">
            <i className="ri-shopping-bag-line mx-auto mb-4 block text-6xl text-gray-300" />
            <h1 className="mb-2 text-xl font-bold text-gray-900">
              장바구니가 비어 있어요
            </h1>
            <p className="mb-6 text-sm text-gray-500">
              텅 빈 장바구니, Ounce의 특별함으로 가득 채워볼까요?
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 rounded-md border border-primary-200 bg-primary-50 px-6 py-2.5 text-sm font-bold text-primary-800 shadow-sm transition-colors hover:bg-primary-100"
            >
              상품 둘러보기
              <i className="ri-arrow-right-line" />
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-[#fcfbf9]">
      <main className="min-h-screen pb-20 pt-20 md:pt-24">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 lg:px-12">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
              장바구니
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {summary.totalItems}개의 상품이 담겨 있어요
            </p>
          </div>

          <div className="mb-6 flex flex-col gap-2">
            <div
              className={`flex w-fit items-center gap-2 rounded-lg border px-3 py-2 ${
                urgent
                  ? "border-[#447861]/20 bg-[#447861]/10 text-[#447861]"
                  : "border-[#3b4055]/15 bg-[#3b4055]/10"
              }`}
            >
              <i
                className={`ri-time-line ${urgent ? "text-[#447861]" : "text-[#3b4055]"}`}
              />
              <span className="text-xs font-medium text-[#3b4055]">
                {urgent ? (
                  <>
                    오늘의 새벽배송 마감 임박!{" "}
                    <strong className="font-bold text-[#396652]">
                      {countdown}
                    </strong>{" "}
                    후 마감
                  </>
                ) : (
                  <>
                    {pastCutoff ? "내일 밤 11시" : "오늘 밤 11시"}까지 주문 시{" "}
                    <strong className="font-bold text-gray-900">
                      {countdown}
                    </strong>{" "}
                    남음 — {pastCutoff ? "모레 아침 7시" : "내일 아침 7시"} 전
                    도착
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      summary.selectedCount === items.length && items.length > 0
                    }
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((item) => ({
                          ...item,
                          selected: event.target.checked,
                        })),
                      )
                    }
                    className="h-5 w-5 cursor-pointer rounded accent-[#447861]"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    전체 선택 ({summary.selectedCount}/{items.length})
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    void removeItems(items.filter((item) => item.selected))
                  }
                  className="text-sm font-medium text-gray-500 transition-colors hover:text-red-500"
                >
                  선택 삭제
                </button>
              </div>

              {loading
                ? Array.from({ length: 3 }, (_, index) => (
                    <div
                      key={index}
                      className="h-32 animate-pulse rounded-lg border border-gray-200 bg-white"
                    />
                  ))
                : items.map((item) => (
                    <CartRow
                      key={item.cartId}
                      item={item}
                      onToggle={(checked) =>
                        setItems((current) =>
                          current.map((cartItem) =>
                            cartItem.cartId === item.cartId
                              ? { ...cartItem, selected: checked }
                              : cartItem,
                          ),
                        )
                      }
                      onQuantity={(delta) =>
                        void updateQuantity(item.cartId, delta)
                      }
                      onRemove={() => void removeItems([item])}
                    />
                  ))}
            </div>

            <div className="w-full shrink-0 lg:w-80">
              <div className="sticky top-24 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-bold text-gray-900">
                  주문 요약
                </h2>

                <div className="mb-4 flex flex-col gap-2.5">
                  <SummaryRow
                    label="상품 금액"
                    value={won(summary.totalPrice)}
                  />
                  <SummaryRow
                    label="배송비"
                    value={
                      subscriptionLoading
                        ? "확인 중"
                        : summary.shipping === 0
                          ? "무료"
                          : won(summary.shipping)
                    }
                    valueClassName={
                      summary.shipping === 0 || subscriptionLoading
                        ? "text-[#3b4055] font-medium"
                        : "text-gray-800 font-medium"
                    }
                  />
                  {subscriptionLoading && (
                    <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
                      구독 무료배송 혜택을 확인하고 있습니다.
                    </div>
                  )}
                  {!subscriptionLoading && hasSubscriptionFreeShipping && (
                    <div className="rounded-lg border border-[#447861]/15 bg-[#447861]/10 px-3 py-2 text-xs font-semibold text-[#447861]">
                      구독 혜택으로 배송비가 무료 적용되었습니다.
                    </div>
                  )}
                  {!subscriptionLoading &&
                    !hasSubscriptionFreeShipping &&
                    summary.shipping > 0 && (
                      <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
                        단품 주문은 배송비 3,000원이 발생합니다. 구독하면
                        무료배송이 적용됩니다.
                      </div>
                    )}
                  {!hasSubscriptionFreeShipping &&
                    summary.totalPrice > 0 &&
                    summary.totalPrice < FREE_SHIPPING_THRESHOLD && (
                      <div className="text-xs text-[#447861]">
                        {(
                          FREE_SHIPPING_THRESHOLD - summary.totalPrice
                        ).toLocaleString("ko-KR")}
                        원 더 담으면 무료배송!
                      </div>
                    )}
                </div>

                <div className="mb-4 h-px bg-gray-200" />

                <div className="mb-5 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">
                    총 결제 금액
                  </span>
                  <span className="text-xl font-bold text-[#447861]">
                    {subscriptionLoading ? "확인 중" : won(summary.finalPrice)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={summary.selectedCount === 0 || subscriptionLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#3b4055] font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-50"
                >
                  <i className="ri-shopping-bag-line text-xl" />
                  {summary.selectedCount === 0
                    ? "상품을 선택해주세요"
                    : subscriptionLoading
                      ? "혜택 확인 중..."
                      : `${won(summary.finalPrice)} 결제하기`}
                </button>

                <div className="mt-4 flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <i className="ri-truck-line mt-0.5 shrink-0 text-gray-500" />
                  <div className="text-xs leading-relaxed text-gray-600">
                    <strong className="text-gray-900">새벽배송</strong>
                    <br />
                    오늘 밤 11시까지 주문 → 내일 아침 7시 전 도착
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function CartRow({
  item,
  onToggle,
  onQuantity,
  onRemove,
}: {
  item: SelectableCartItem;
  onToggle: (checked: boolean) => void;
  onQuantity: (delta: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-gray-300">
      <input
        type="checkbox"
        checked={item.selected}
        onChange={(event) => onToggle(event.target.checked)}
        className="mt-2 h-5 w-5 shrink-0 cursor-pointer accent-[#447861]"
      />
      <Link
        href={`/products-detail/${item.productId}`}
        className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-gray-100 bg-gray-50 md:h-24 md:w-24"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl || PRODUCT_PLACEHOLDER}
          alt={item.name}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.src = PRODUCT_PLACEHOLDER;
          }}
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <Link
          href={`/products-detail/${item.productId}`}
          className="clamp-2 text-sm font-medium text-gray-900 transition-colors hover:text-[#3b4055]"
        >
          {item.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onQuantity(-1)}
              disabled={item.quantity <= 1}
              className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <i className="ri-subtract-line text-sm" />
            </button>
            <span className="w-6 text-center text-sm font-medium text-gray-800">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onQuantity(1)}
              disabled={item.quantity >= 10}
              className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <i className="ri-add-line text-sm" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            {item.timeDeal && (
              <span className="text-xs text-gray-400 line-through">
                {won(item.basePrice * item.quantity)}
              </span>
            )}
            <span
              className={`text-sm font-bold ${item.timeDeal ? "text-[#447861]" : "text-gray-900"}`}
            >
              {won(item.finalPrice * item.quantity)}
            </span>
            <button
              type="button"
              onClick={onRemove}
              className="flex h-7 w-7 items-center justify-center text-gray-400 transition-colors hover:text-red-500"
            >
              <i className="ri-close-line text-xl" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName = "font-medium text-gray-800",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}
