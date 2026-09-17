"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Footer from "../../../../components/Footer";
import { won } from "../../../../lib/products";

const PAYMENT_COMPLETE_KEY = "ounce.checkout.payment-complete";

export default function CheckoutPaymentCompletePage() {
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PAYMENT_COMPLETE_KEY);
      if (raw) setAmount(Number((JSON.parse(raw) as { amount?: number }).amount) || 0);
    } catch {
      setAmount(0);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background-cream">
      <main className="flex flex-1 items-center justify-center px-4 py-24 md:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-background-200 bg-white p-8 text-center shadow-sm md:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <i className="ri-check-line text-3xl" />
            </div>
            <p className="mt-6 text-xs font-bold tracking-[0.16em] text-primary-600">ORDER COMPLETE</p>
            <h1 className="mt-2 text-2xl font-black text-foreground-950">주문이 완료되었습니다.</h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-foreground-500">
              주문 금액 확인후 구독 상품을 보내드립니다 !
            </p>
            <p className="mt-3 text-sm font-semibold text-primary-600">주문 결제 대기</p>
            <div className="mt-7 rounded-xl bg-background-50 px-5 py-4">
              <span className="text-sm text-foreground-500">주문 금액</span>
              <strong className="ml-3 text-xl text-primary-600">{won(amount)}</strong>
            </div>
            <Link href="/subscription" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary-500 text-sm font-bold text-white transition-colors hover:bg-primary-600">
              내 구독 보기
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
