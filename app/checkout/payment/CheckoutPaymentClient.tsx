"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../../components/Footer";
import { useToast } from "../../../components/ToastContext";
import { apiFetch } from "@/lib/api";
import { won } from "../../../lib/products";
import type { SubscriptionCheckoutResponse, SubscriptionCreateRequest } from "../../../types/api";

const PENDING_PAYMENT_KEY = "ounce.checkout.pending-payment";
const PAYMENT_COMPLETE_KEY = "ounce.checkout.payment-complete";
const PENDING_TRANSFER_KEY = "ounce.subscription.pending-transfer";

type PaymentDraft = {
  receiverName: string;
  receiverPhone: string;
  zipCode: string;
  address: string;
  addressDetail: string;
  couponId: number | null;
  selectedCartIds: number[];
  subscriptionRequest: SubscriptionCreateRequest | null;
  amount: number;
};

type PaymentMethod = "CARD" | "TRANSFER";

export default function CheckoutPaymentClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [draft, setDraft] = useState<PaymentDraft | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("CARD");
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_PAYMENT_KEY);
      if (!raw) {
        toast("결제 정보를 찾을 수 없습니다.", "error");
        router.replace("/checkout");
        return;
      }
      setDraft(JSON.parse(raw) as PaymentDraft);
    } catch {
      toast("결제 정보를 불러오지 못했습니다.", "error");
      router.replace("/checkout");
    }
  }, [router, toast]);

  const completePayment = async () => {
    if (!draft || processing || completed) return;
    setProcessing(true);
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    try {
      const response = draft.subscriptionRequest
        ? await apiFetch("/api/subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(draft.subscriptionRequest),
          })
        : await apiFetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              selectedCartProductIds: draft.selectedCartIds,
              deliveryType: "DAWN",
              couponId: draft.couponId,
              receiverName: draft.receiverName,
              receiverPhone: draft.receiverPhone,
              zipCode: draft.zipCode,
              address: draft.address,
              addressDetail: draft.addressDetail,
              paymentMethod: method,
            }),
          });

      if (response.status === 401 || response.status === 403) {
        router.push("/login");
        return;
      }
      if (response.status === 409) {
        toast("이미 이용 중인 구독이 있습니다.", "error");
        return;
      }
      if (!response.ok) {
        toast("결제에 실패했습니다. 다시 시도해주세요.", "error");
        return;
      }

      const result = (await response.json().catch(() => null)) as SubscriptionCheckoutResponse | null;
      if (method === "TRANSFER" && draft.subscriptionRequest) {
        localStorage.setItem(
          PENDING_TRANSFER_KEY,
          JSON.stringify({ amount: draft.amount, createdAt: new Date().toISOString() }),
        );
        localStorage.setItem(
          PAYMENT_COMPLETE_KEY,
          JSON.stringify({ amount: draft.amount, message: result?.message }),
        );
        localStorage.removeItem(PENDING_PAYMENT_KEY);
        router.push("/checkout/payment/complete");
        return;
      }
      localStorage.removeItem(PENDING_PAYMENT_KEY);
      setCompleted(true);
      if (draft.subscriptionRequest) {
        toast(result?.message || "첫 구독 결제가 완료되었습니다.");
      } else {
        toast("결제가 완료되었습니다.");
      }
    } catch {
      toast("결제 처리 중 오류가 발생했습니다.", "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background-cream">
      <main className="flex-1 px-4 pb-20 pt-24 md:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <Link href="/checkout" className="text-sm font-semibold text-foreground-500 hover:text-primary-600">← 결제 정보로 돌아가기</Link>
          <div className="mt-6 rounded-2xl border border-background-200 bg-white p-5 shadow-sm md:p-8">
            <p className="text-xs font-bold tracking-[0.16em] text-primary-600">PAYMENT</p>
            <h1 className="mt-2 text-2xl font-black text-foreground-950">결제 수단 선택</h1>
            <p className="mt-2 text-sm text-foreground-500">안전한 테스트 결제 페이지입니다.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <PaymentMethodButton active={method === "CARD"} icon="ri-bank-card-2-line" title="신용카드" description="카드로 결제" onClick={() => setMethod("CARD")} />
              <PaymentMethodButton active={method === "TRANSFER"} icon="ri-bank-line" title="계좌이체" description="계좌이체" onClick={() => setMethod("TRANSFER")} />
            </div>
            {method === "CARD" ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Field label="카드번호" value="4242 4242 4242 4242" />
                <Field label="카드 소유자" value="OUNCE TEST" />
                <Field label="유효기간" value="12 / 30" />
                <Field label="CVC" value="***" />
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm text-primary-800">
                <p className="font-bold">계좌이체</p>
                <p className="mt-1 text-xs leading-relaxed">Ounce 우리은행 1002-359-384294 · 예금주 권혜준</p>
              </div>
            )}
            <div className="mt-6 flex items-center justify-between border-t border-background-200 pt-5"><span className="text-sm text-foreground-500">결제 금액</span><strong className="text-2xl text-primary-600">{won(draft?.amount ?? 0)}</strong></div>
            <button type="button" onClick={() => void completePayment()} disabled={!draft || processing || completed} className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary-500 text-sm font-bold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"><i className={processing ? "ri-loader-4-line animate-spin" : completed ? "ri-check-line" : "ri-lock-2-line"} />{processing ? "결제 처리 중..." : completed ? "결제 완료" : `${won(draft?.amount ?? 0)} 결제하기`}</button>
            {/* <p className="mt-3 text-center text-xs text-foreground-400">실제 결제가 발생하지 않는 테스트 결제입니다.</p> */}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function PaymentMethodButton({ active, icon, title, description, onClick }: { active: boolean; icon: string; title: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${active ? "border-primary-500 bg-primary-50" : "border-background-200 bg-white hover:border-primary-200"}`}><i className={`${icon} text-2xl text-primary-600`} /><span><strong className="block text-sm text-foreground-950">{title}</strong><span className="mt-1 block text-xs text-foreground-500">{description}</span></span>{active && <i className="ri-checkbox-circle-fill ml-auto text-primary-600" />}</button>;
}

function Field({ label, value }: { label: string; value: string }) {
  return <label className="text-xs font-semibold text-foreground-600">{label}<input value={value} readOnly className="mt-1.5 h-12 w-full rounded-lg border border-background-200 bg-background-50 px-4 text-sm text-foreground-700 outline-none" /></label>;
}
