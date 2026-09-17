"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../../components/Footer";
import { useAuth } from "../../../components/AuthContext";
import { useToast } from "../../../components/ToastContext";
import {
  fetchCatalog,
  getProductPrice,
  splitName,
  subscriptionDiscountPercentOf,
  won,
} from "../../../lib/products";
import { apiFetch } from "@/lib/api";
import type { Product, SubscriptionCreateRequest, SubscriptionCheckoutResponse } from "../../../types/api";

const PENDING_SUBSCRIPTION_KEY = "ounce.subscription.pending-checkout";

function readPendingRequest() {
  try {
    const value = localStorage.getItem(PENDING_SUBSCRIPTION_KEY);
    return value ? (JSON.parse(value) as SubscriptionCreateRequest) : null;
  } catch {
    return null;
  }
}

export default function SubscribePaymentClient() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [request, setRequest] = useState<SubscriptionCreateRequest | null>(null);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    const pending = readPendingRequest();
    if (!pending || !pending.selection) {
      toast("구독 메뉴를 먼저 선택해주세요.", "error");
      router.replace("/subscribe");
      return;
    }
    setRequest(pending);
    fetchCatalog(80)
      .then(setCatalog)
      .catch(() => toast("결제 상품 정보를 불러오지 못했습니다.", "error"))
      .finally(() => setLoading(false));
  }, [router, toast]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast("로그인 후 결제할 수 있습니다.", "error");
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router, toast]);

  const selectedItems = useMemo(() => {
    if (!request) return [];
    const byId = new Map(catalog.map((product) => [product.productId, product]));
    return Object.entries(request.selection)
      .map(([id, quantity]) => ({ product: byId.get(Number(id)), quantity: Number(quantity) }))
      .filter((item): item is { product: Product; quantity: number } => Boolean(item.product) && item.quantity > 0);
  }, [catalog, request]);

  const total = selectedItems.reduce(
    (sum, item) => sum + subscriptionPriceOf(item.product) * item.quantity,
    0,
  );

  const pay = async () => {
    if (!request || !agree || submitting) return;
    setSubmitting(true);
    try {
      const response = await apiFetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(request),
      });
      if (response.status === 401 || response.status === 403) {
        router.push("/login");
        return;
      }
      if (response.status === 409) {
        toast("이미 이용 중인 구독이 있습니다.", "error");
        router.push("/subscription");
        return;
      }
      if (!response.ok) {
        toast("첫 결제에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
        return;
      }
      const result = (await response.json().catch(() => null)) as SubscriptionCheckoutResponse | null;
      toast(result?.message || `주 ${request.mealsPerWeek}끼 구독이 시작되었습니다.`);
      router.push("/subscription");
    } catch {
      toast("결제 중 오류가 발생했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background-cream">
      <main className="min-h-screen px-4 pb-20 pt-24 md:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <p className="text-xs font-bold tracking-[0.16em] text-primary-600">SUBSCRIPTION PAYMENT</p>
            <h1 className="mt-2 text-3xl font-black text-foreground-950">첫 구독 결제</h1>
            <p className="mt-2 text-sm text-foreground-500">선택한 메뉴와 결제 정보를 확인해주세요.</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <section className="rounded-2xl border border-background-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="mb-4 text-base font-bold text-foreground-950">첫 배송 메뉴</h2>
              {loading ? <p className="py-10 text-center text-sm text-foreground-400">메뉴를 불러오는 중...</p> : selectedItems.length === 0 ? <p className="py-10 text-center text-sm text-foreground-400">선택한 메뉴를 찾을 수 없습니다.</p> : (
                <div className="divide-y divide-background-100">
                  {selectedItems.map(({ product, quantity }) => {
                    const parts = splitName(product.name);
                    const price = getProductPrice(product);
                    const subscriptionPrice = subscriptionPriceOf(product);
                    return <div key={product.productId} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground-900">{parts.title}</p><p className="mt-1 text-xs text-foreground-400"><span className="line-through">{won(price)}</span><span className="ml-1.5 font-semibold text-primary-600">구독 {won(subscriptionPrice)}</span> · {quantity}개</p></div><span className="text-sm font-bold text-foreground-900">{won(subscriptionPrice * quantity)}</span></div>;
                  })}
                </div>
              )}
              <div className="mt-5 rounded-xl bg-primary-50 p-4 text-sm text-primary-800"><p className="font-bold">주 {request?.mealsPerWeek ?? "-"}끼 정기 구독</p><p className="mt-1 text-xs text-primary-700">첫 결제 후 매주 같은 메뉴가 자동 배송되며, 다음 결제 전 메뉴를 변경할 수 있습니다.</p></div>
            </section>

            <aside className="h-fit rounded-2xl bg-foreground-950 p-5 text-white shadow-lg lg:sticky lg:top-24">
              <h2 className="text-base font-bold">결제 정보</h2>
              <div className="mt-5 flex items-center justify-between border-b border-white/10 pb-4 text-sm"><span className="text-white/60">첫 결제 금액</span><strong className="text-xl">{won(total)}</strong></div>
              <div className="mt-4 flex items-start gap-2"><input id="subscribe-payment-agree" type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} className="mt-0.5 accent-primary-500" /><label htmlFor="subscribe-payment-agree" className="text-xs leading-relaxed text-white/70">구독 결제 및 매주 자동 결제 안내를 확인했습니다.</label></div>
              <button type="button" onClick={() => void pay()} disabled={!request || loading || selectedItems.length === 0 || !agree || submitting} className="mt-5 w-full rounded-lg bg-primary-500 py-3 text-sm font-bold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "결제 처리 중..." : `${won(total)} 결제하고 구독 시작`}</button>
              <Link href="/subscribe" className="mt-3 block text-center text-xs text-white/50 hover:text-white">메뉴 다시 선택</Link>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function subscriptionPriceOf(product: Product) {
  const discount = subscriptionDiscountPercentOf(product) || 10;
  return Math.round((getProductPrice(product) * (100 - discount)) / 100);
}
