"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Footer from "../../../components/Footer";
import { useToast } from "../../../components/ToastContext";
import { formatDate } from "../../../lib/date";
import { won } from "../../../lib/products";
import { apiFetch } from "@/lib/api";
import type { Order, OrderItem } from "../../../types/api";

const STATUS_LABELS: Record<string, string> = {
  PAYMENT_WAITING: "결제 대기",
  PAYMENT_COMPLETED: "결제 완료",
  PREPARING: "상품 준비중",
  SHIPPED: "배송 중",
  DELIVERED: "배송 완료",
  CANCELED: "주문 취소",
};

const STATUS_BADGES: Record<string, string> = {
  PAYMENT_WAITING: "bg-foreground-100 text-foreground-600",
  PAYMENT_COMPLETED: "bg-accent-100 text-accent-700",
  PREPARING: "bg-secondary-100 text-secondary-800",
  SHIPPED: "bg-primary-100 text-primary-700",
  DELIVERED: "bg-accent-100 text-accent-700",
  CANCELED: "bg-red-100 text-red-700",
};

const STATUS_STEPS = [
  { key: "PAYMENT_COMPLETED", label: "결제 완료", icon: "ri-bank-card-line" },
  { key: "PREPARING", label: "상품 준비중", icon: "ri-archive-line" },
  { key: "SHIPPED", label: "배송 중", icon: "ri-truck-line" },
  { key: "DELIVERED", label: "배송 완료", icon: "ri-home-smile-line" },
];

function readItems(order: Order): OrderItem[] {
  return order.orderItems ?? order.items ?? order.products ?? [];
}

function itemName(item: OrderItem) {
  return item.productName || item.name || (item.productId ? `상품 ${item.productId}` : "상품");
}

function itemPrice(item: OrderItem) {
  return Number(item.totalPrice ?? Number(item.unitPrice ?? item.price ?? 0) * Number(item.quantity ?? 1));
}

function orderCode(order: Order) {
  return order.orderNumber || `ORD-${String(order.orderId).padStart(6, "0")}`;
}

function orderDate(order: Order) {
  return order.createdAt || order.createdDate || order.created_at || order.orderDate || order.orderedAt || order.ordered_at;
}

function amount(order: Order) {
  return Number(order.paymentAmount ?? order.finalAmount ?? order.totalAmount ?? order.orderAmount ?? order.amount ?? 0);
}

function normalizeOrder(data: Order | { data?: Order; order?: Order }) {
  if ("orderId" in data) return data;
  return data.data ?? data.order;
}

export default function OrderDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const orderId = useMemo(() => Number(params.id), [params.id]);

  useEffect(() => {
    if (!Number.isInteger(orderId) || orderId <= 0) {
      setLoading(false);
      return;
    }

    apiFetch(`/api/orders/${orderId}`, { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401) {
          toast("로그인이 필요한 페이지입니다.", "error");
          router.push("/login");
          return null;
        }
        if (response.status === 404) {
          router.push("/not-found");
          return null;
        }
        if (!response.ok) throw new Error("ORDER_DETAIL_FAILED");
        return normalizeOrder((await response.json()) as Order | { data?: Order; order?: Order });
      })
      .then((data) => {
        if (data) setOrder(data);
      })
      .catch(() => toast("주문 상세 정보를 불러오지 못했습니다.", "error"))
      .finally(() => setLoading(false));
  }, [orderId, router, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-cream pb-20 pt-28">
        <div className="mx-auto max-w-4xl space-y-4 px-4 md:px-8">
          <div className="h-8 w-48 animate-pulse rounded bg-background-200" />
          <div className="h-48 animate-pulse rounded-xl bg-white" />
          <div className="h-64 animate-pulse rounded-xl bg-white" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background-cream pb-20 pt-32 text-center">
        <i className="ri-file-warning-line mb-3 block text-5xl text-foreground-300" />
        <p className="text-foreground-600">주문 정보를 찾을 수 없습니다.</p>
        <Link href="/orders" className="mt-5 inline-flex rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white">
          주문 내역으로
        </Link>
      </div>
    );
  }

  const items = readItems(order);
  const total = amount(order);
  const productAmount = Number(order.productAmount ?? order.orderAmount ?? order.amount ?? total);
  const shippingFee = Number(order.shippingFee ?? 0);
  const discount = Number(order.discountAmount ?? 0);
  const currentStep = STATUS_STEPS.findIndex((step) => step.key === order.status);
  const canceled = order.status === "CANCELED";

  return (
    <div className="bg-background-cream">
      <main className="min-h-screen pb-20 pt-28">
        <div className="mx-auto w-full max-w-4xl px-4 md:px-8">
          <Link href="/orders" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-foreground-500 hover:text-foreground-950">
            <i className="ri-arrow-left-line" /> 주문 내역
          </Link>

          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground-950">주문 상세</h1>
              <p className="mt-1.5 text-sm text-foreground-500">{orderCode(order)} · {formatDate(orderDate(order), true) || "주문일 미상"}</p>
            </div>
            <span className={`rounded-md px-3 py-1.5 text-sm font-semibold ${STATUS_BADGES[order.status] || "bg-foreground-100 text-foreground-600"}`}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>

          <div className="space-y-4">
            <section className="rounded-xl border border-background-200 bg-white p-5 md:p-6">
              <h2 className="mb-6 text-base font-bold text-foreground-950">주문 상태</h2>
              {canceled ? (
                <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                  <i className="ri-close-circle-line text-xl" /> 취소된 주문입니다.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1">
                  {STATUS_STEPS.map((step, index) => {
                    const active = currentStep >= index;
                    return (
                      <div key={step.key} className="relative text-center">
                        <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${active ? "bg-primary-500 text-white" : "bg-background-100 text-foreground-300"}`}>
                          <i className={`${step.icon} text-lg`} />
                        </div>
                        <p className={`mt-2 text-xs font-semibold ${active ? "text-primary-700" : "text-foreground-400"}`}>{step.label}</p>
                        {index < STATUS_STEPS.length - 1 && <span className={`absolute left-[calc(50%+22px)] right-[calc(-50%+22px)] top-5 h-px ${currentStep > index ? "bg-primary-400" : "bg-background-200"}`} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border border-background-200 bg-white">
              <div className="border-b border-background-200 px-5 py-4 md:px-6"><h2 className="text-base font-bold text-foreground-950">주문 상품 <span className="ml-1 text-sm font-normal text-foreground-400">{items.length}건</span></h2></div>
              <div className="divide-y divide-background-100">
                {items.length === 0 ? <p className="p-6 text-sm text-foreground-500">상품 상세 정보가 없습니다.</p> : items.map((item, index) => (
                  <div key={item.orderItemId ?? `${item.productId}-${index}`} className="flex items-center gap-4 px-5 py-4 md:px-6">
                    {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-16 w-16 rounded-lg bg-background-100 object-cover" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-background-100 text-2xl text-foreground-300"><i className="ri-restaurant-line" /></div>}
                    <div className="min-w-0 flex-1"><p className="font-semibold text-foreground-900">{itemName(item)}</p><p className="mt-1 text-sm text-foreground-500">{won(Number(item.unitPrice ?? item.price ?? itemPrice(item)))} · {item.quantity ?? 1}개</p></div>
                    <p className="shrink-0 text-sm font-bold text-foreground-900">{won(itemPrice(item))}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-xl border border-background-200 bg-white p-5 md:p-6"><h2 className="mb-4 text-base font-bold">배송 정보</h2><dl className="space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-foreground-500">받는 분</dt><dd className="text-right font-medium">{order.receiverName || "-"}</dd></div><div className="flex justify-between gap-4"><dt className="text-foreground-500">연락처</dt><dd className="text-right font-medium">{order.receiverPhone || "-"}</dd></div><div className="flex justify-between gap-4"><dt className="text-foreground-500">배송지</dt><dd className="max-w-[70%] text-right font-medium">{order.shippingAddress || order.address || "-"}</dd></div>{order.memo && <div className="flex justify-between gap-4"><dt className="text-foreground-500">배송 메모</dt><dd className="max-w-[70%] text-right font-medium">{order.memo}</dd></div>}</dl></section>
              <section className="rounded-xl border border-background-200 bg-white p-5 md:p-6"><h2 className="mb-4 text-base font-bold">결제 금액</h2><dl className="space-y-3 text-sm"><div className="flex justify-between"><dt className="text-foreground-500">상품 금액</dt><dd>{won(productAmount)}</dd></div><div className="flex justify-between"><dt className="text-foreground-500">배송비</dt><dd>{shippingFee ? won(shippingFee) : "무료"}</dd></div>{discount > 0 && <div className="flex justify-between"><dt className="text-foreground-500">할인 금액</dt><dd className="text-red-500">-{won(discount)}</dd></div>}<div className="mt-3 flex justify-between border-t border-background-200 pt-3 text-base font-bold"><dt>총 결제 금액</dt><dd className="text-primary-600">{won(total)}</dd></div></dl></section>
            </div>

            <div className="flex justify-center pt-2"><Link href="/support" className="inline-flex items-center gap-1.5 rounded-lg border border-background-300 bg-white px-4 py-2.5 text-sm font-semibold text-foreground-700 hover:bg-background-100"><i className="ri-customer-service-2-line" /> 주문 관련 문의</Link></div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
