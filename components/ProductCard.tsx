"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "../types/api";
import {
  getProductPrice,
  isDiscounted,
  PRODUCT_PLACEHOLDER,
  splitName,
  stockState,
  subscriptionDiscountPercentOf,
  won,
} from "../lib/products";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";
import { useToast } from "./ToastContext";
import { apiFetch } from "@/lib/api";

export function ProductSkeleton() {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-xl border border-background-200 bg-white"
      aria-hidden="true"
    >
      <div className="aspect-square w-full bg-background-200" />
      <div className="flex flex-col gap-2 p-3.5 md:p-4">
        <div className="h-4 w-3/4 rounded bg-background-200" />
        <div className="h-3 w-full rounded bg-background-100" />
        <div className="mt-1 h-3 w-1/3 rounded bg-background-100" />
        <div className="mt-2.5 flex items-center justify-between">
          <div className="h-5 w-20 rounded bg-background-200" />
          <div className="h-9 w-9 rounded-full bg-background-200" />
        </div>
      </div>
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div
      className="aspect-[4/5] animate-pulse rounded-xl bg-background-200 md:aspect-square"
      aria-hidden="true"
    />
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { items: cartItems, refresh } = useCart();
  const { toast, confirm } = useToast();
  const [adding, setAdding] = useState(false);

  const parts = splitName(product.name);
  const state = stockState(product);
  const isTimeDeal = product.status === "TIME_DEAL";
  const subscriptionDiscountPercent =
    subscriptionDiscountPercentOf(product) ?? 0;
  const cartItem = cartItems.find(
    (item) => item.productId === product.productId,
  );
  const productStock = Number(product.stock);
  const maxCartQuantity = Number.isFinite(productStock)
    ? Math.max(1, Math.min(10, productStock))
    : 10;
  const soldOut = state === "soldout";
  const price = getProductPrice(product);
  const subscriptionPrice = Math.round(
    (price * (100 - subscriptionDiscountPercent)) / 100,
  );

  const addToCart = async () => {
    if (adding) return;
    setAdding(true);

    try {
      if (!isAuthenticated) {
        const ok = await confirm("로그인이 필요합니다.", {
          kind: "login",
          description: "로그인 후 장바구니를 사용할 수 있습니다.",
        });
        if (ok) router.push("/login");
        return;
      }

      if (cartItem && cartItem.quantity >= maxCartQuantity) {
        toast(
          maxCartQuantity < 10
            ? `재고가 ${maxCartQuantity}개라 더 담을 수 없습니다.`
            : "상품 1개당 최대 10개까지 담을 수 있습니다.",
          "error",
        );
        return;
      }

      const response = await apiFetch(
        `/api/carts/items?productId=${product.productId}&quantity=1`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        toast("상품 1개당 최대 10개까지 담을 수 있습니다.", "error");
        return;
      }
      await refresh();
      toast("장바구니에 담았습니다.");
    } catch {
      toast("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-background-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-background-300 hover:shadow-lg ${
        soldOut ? "opacity-70" : ""
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-background-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl || PRODUCT_PLACEHOLDER}
          alt={parts.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          onError={(event) => {
            event.currentTarget.src = PRODUCT_PLACEHOLDER;
          }}
        />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {isTimeDeal && (
            <span className="rounded-md bg-deal-500 px-2 py-1 text-[11px] font-bold text-white shadow-sm">
              미드나이트
            </span>
          )}
          {parts.serving && (
            <span className="rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-foreground-700 shadow-sm backdrop-blur-sm">
              {parts.serving}
            </span>
          )}
          {subscriptionDiscountPercent > 0 && (
            <span className="rounded-md bg-primary-500 px-2 py-1 text-[11px] font-bold text-white shadow-sm">
              구독 할인 {subscriptionDiscountPercent}%
            </span>
          )}
          {state === "low" && (
            <span className="rounded-md bg-red-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm">
              품절임박
            </span>
          )}
        </div>
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground-950/55">
            <span className="rounded-full bg-white/95 px-4 py-1.5 text-xs font-bold text-foreground-800">
              품절
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3.5 md:p-4">
        <h3 className="clamp-1 text-[15px] font-semibold leading-snug text-foreground-950">
          {parts.title}
        </h3>
        <p className="clamp-1 text-xs leading-relaxed text-foreground-500">
          {product.description}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-secondary-600" />
          <span className="text-[11px] font-medium text-secondary-600">
            내일 새벽 7시 도착
          </span>
        </div>
        <div className="mt-2.5 flex items-end justify-between gap-2">
          <div>
            {isDiscounted(product) && (
              <p className="text-[11px] text-foreground-400 line-through">
                {won(product.basePrice)}
              </p>
            )}
            <p className="text-base font-bold text-foreground-950">
              {won(price)}
            </p>
            {subscriptionDiscountPercent > 0 && (
              <p className="mt-0.5 text-xs font-bold text-primary-600">
                구독가 {won(subscriptionPrice)}
              </p>
            )}
          </div>
          {soldOut ? (
            <span
              className="relative z-20 flex h-9 w-9 items-center justify-center rounded-full bg-background-200 text-foreground-400"
              aria-hidden="true"
            >
              <i className="ri-shopping-cart-2-line text-sm" />
            </span>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void addToCart();
              }}
              disabled={adding}
              className="relative z-20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white shadow-sm transition-all duration-150 hover:scale-105 hover:bg-primary-600 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:bg-primary-300"
              aria-label={`${parts.title} 장바구니에 담기`}
            >
              <i className="ri-shopping-cart-2-line text-sm" />
            </button>
          )}
        </div>
      </div>

      <Link
        href={`/products-detail/${product.productId}`}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        aria-label={`${parts.title} 상세 보기`}
      />
    </article>
  );
}
