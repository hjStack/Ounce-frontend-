"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Footer from "../components/Footer";
import ProductCard, { CategorySkeleton, ProductSkeleton } from "../components/ProductCard";
import { LaunchCouponStrip } from "../components/LaunchFreeShippingCoupon";
import { CATEGORIES, fetchCatalog, fetchCategoryCounts, PRODUCT_PLACEHOLDER } from "../lib/products";
import type { Product } from "../types/api";

const pad = (value: number) => String(value).padStart(2, "0");

export default function HomeClient() {
    const [countdown, setCountdown] = useState("--:--:--");
    const [menuCount, setMenuCount] = useState("–");
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const tick = () => {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            const total = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
            setCountdown(`${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`);
        };
        tick();
        const timer = window.setInterval(tick, 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchCategoryCounts()
            .then((data) => {
                if (data.all !== undefined) setMenuCount(String(data.all));
            })
            .catch(() => undefined);
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchCatalog(20)
            .then((items) => {
                setProducts(items);
                setError(items.length ? "" : "상품 목록이 비어있습니다.");
            })
            .catch(() => {
                setProducts([]);
                setError("데이터를 불러오지 못했습니다.");
            })
            .finally(() => setLoading(false));
    }, []);

    const featured = products.slice(0, 8);
    const categoryCards = useMemo(() => CATEGORIES, []);

    return (
        <div className="bg-background-cream">
            <main className="pt-20 md:pt-24">
                <LaunchCouponStrip href="/subscribe" ctaLabel="구독 시작하기" />

                <section className="mx-auto flex w-full max-w-7xl flex-col items-center gap-12 px-6 pb-14 pt-8 md:flex-row md:px-8 md:pb-20 md:pt-12 lg:gap-20 lg:px-12">
                    <div className="z-10 flex w-full flex-col items-start text-left md:w-1/2">
                        <div className="mb-6 flex items-center gap-4">
                            <div className="h-px w-8 bg-black" />
                            <span className="text-xs font-bold text-black">남는 재료 없이 깔끔하게</span>
                        </div>

                        <h1 className="mb-6 text-4xl font-black leading-[1.15] text-foreground-950 md:text-5xl lg:text-[3.4rem]">
                            딱 맞는 1인분만,
                            <span className="mt-4 block text-black">낭비 없는 맛있는 습관</span>
                        </h1>

                        <p className="mb-8 text-base leading-relaxed text-foreground-600 md:text-lg">
                            2-3인분 말고 딱 1인분.
                            <br className="hidden md:block" />
                            손질과 계량이 끝난 상태로 도착합니다.
                            <br className="hidden md:block" />
                            냄비 하나, 10분이면 완성됩니다.
                        </p>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-4 sm:gap-x-7 md:gap-x-9">
                            <Stat value={menuCount} suffix="종" label="밀키트 메뉴" />
                            <Stat value="10분" label="조리 시간" divided />
                            <Stat value="0원" label="구독 배송비" divided />
                        </div>
                    </div>

                    <div className="flex w-full flex-col gap-4 md:w-1/2">
                        <FeatureCard
                            dark
                            icon="ri-moon-line"
                            title="미드나이트 세일"
                            label="매일 22:00 - 23:00"
                            description="한 시간만 열리는 특별한 가격의 밀키트. 선착순 한정 수량."
                        />
                        <FeatureCard
                            icon="ri-truck-line"
                            title="구독 무료배송"
                            label="배송비 0원 · 서울 새벽배송"
                            description="구독은 끼 수와 관계없이 무료배송. 일요일 23시 전까지 고르면 목요일 아침 도착."
                        />
                        <FeatureCard
                            icon="ri-knife-line"
                            title="1인분 소분"
                            label="남기지 않는 정량 포장"
                            description="혼자여도 딱 필요한 만큼만. 버리는 음식 없이 알뜰하게."
                        />
                    </div>
                </section>

                <section className="mx-auto w-full max-w-7xl px-4 pb-4 md:px-8 lg:px-12">
                    <Link
                        href="/subscribe"
                        className="group flex flex-col items-center justify-between gap-4 rounded-xl bg-primary-500 px-6 py-5 shadow-lg transition-colors hover:bg-primary-600 sm:flex-row md:px-8"
                    >
                        <div className="flex items-center gap-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
                                <i className="ri-calendar-check-line text-lg text-white" />
                            </span>
                            <div>
                                <p className="text-sm font-bold text-white">구독 시작하기 — 한 주 저녁을 미리 정해두세요</p>
                                <p className="mt-0.5 text-xs text-white/70">
                                    구독은 배송비 0원 · 일주일에 4~7끼 · 메뉴는 일요일 23시 전까지 직접 변경
                                </p>
                            </div>
                        </div>
                        <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-bold text-primary-700">
                            구독 시작하기
                            <i className="ri-arrow-right-line transition-transform group-hover:translate-x-0.5" />
                        </span>
                    </Link>
                </section>

                <section className="mx-auto w-full max-w-7xl px-4 pb-14 md:px-8 md:pb-20 lg:px-12">
                    <Link
                        href="/timedeal"
                        className="group flex flex-col items-center justify-between gap-4 rounded-xl border border-indigo-900 bg-indigo-950 px-6 py-5 shadow-lg transition-colors hover:bg-indigo-900 sm:flex-row md:px-8"
                    >
                        <div className="flex items-center gap-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500 shadow-inner">
                                <i className="ri-moon-line text-lg text-white" />
                            </span>
                            <div>
                                <p className="text-sm font-bold text-white">미드나이트 세일 — 매일 밤 10시부터 한 시간</p>
                                <p className="mt-0.5 text-xs text-indigo-300">선착순 한정 수량 · 내일 아침 7시 배송</p>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                            <div className="flex items-center gap-1.5 text-indigo-300">
                                <i className="ri-time-line text-sm text-indigo-400" />
                                <span className="text-xs">자정까지</span>
                                <span className="text-sm font-bold tabular-nums text-white">{countdown}</span>
                            </div>
                            <span className="flex items-center gap-1 text-xs font-bold text-indigo-400 transition-colors group-hover:text-white">
                                보러 가기 <i className="ri-arrow-right-line transition-transform group-hover:translate-x-0.5" />
                            </span>
                        </div>
                    </Link>
                </section>

                <section className="mx-auto w-full max-w-7xl px-4 pb-16 md:px-8 md:pb-24 lg:px-12">
                    <SectionHeader
                        eyebrow="Meal Kits"
                        title="지금 주문 가능한 밀키트"
                        description="손질·계량 끝난 1인분. 오늘 주문하면 내일 새벽 7시 도착."
                        href="/products"
                        linkText="전체 보기"
                    />
                    <div className="grid grid-cols-2 gap-4 md:gap-5 sm:grid-cols-3 lg:grid-cols-4">
                        {loading && Array.from({ length: 8 }, (_, index) => <ProductSkeleton key={index} />)}
                        {!loading && featured.map((product) => <ProductCard key={product.productId} product={product} />)}
                    </div>
                    {error && <p className="py-16 text-center text-sm text-foreground-400">{error}</p>}
                </section>

                <section className="w-full bg-background-100 py-16 md:py-24">
                    <div className="mx-auto w-full max-w-7xl px-4 md:px-8 lg:px-12">
                        <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
                            <div>
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="h-px w-8 bg-accent-500" />
                                    <span className="text-xs font-bold text-accent-500">Categories</span>
                                </div>
                                <h2 className="text-2xl font-bold text-foreground-950 md:text-3xl">오늘은 뭐 먹지?</h2>
                            </div>
                            <p className="max-w-xs text-sm text-foreground-500">찌개부터 파스타까지, 먹고 싶은 걸로 골라보세요</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
                            {loading
                                ? Array.from({ length: categoryCards.length }, (_, index) => <CategorySkeleton key={index} />)
                                : categoryCards.map((category, index) => {
                                      const cover = products[index]?.imageUrl || PRODUCT_PLACEHOLDER;
                                      return (
                                          <Link
                                              key={category.key}
                                              href={`/products?categories=${category.key}`}
                                              className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-background-200 shadow-sm transition-shadow hover:shadow-lg md:aspect-square"
                                          >
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img
                                                  src={cover}
                                                  alt={category.label}
                                                  loading="lazy"
                                                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                              />
                                              <div className="absolute inset-0 bg-gradient-to-t from-foreground-950/85 via-foreground-950/20 to-transparent" />
                                              <div className="absolute inset-x-0 bottom-0 p-4">
                                                  <i className={`${category.icon} mb-1 block text-lg text-accent-400`} />
                                                  <h3 className="text-sm font-bold leading-snug text-white md:text-base">{category.label}</h3>
                                              </div>
                                          </Link>
                                      );
                                  })}
                        </div>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8 md:py-24 lg:px-12">
                    <div className="relative overflow-hidden rounded-3xl border border-indigo-800/50 bg-indigo-950 px-6 py-14 text-center shadow-2xl md:px-12">
                        <div className="relative z-10 mx-auto max-w-xl">
                            <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/20 text-indigo-400">
                                <i className="ri-moon-fill text-2xl" />
                            </span>
                            <h2 className="mb-4 text-3xl font-extrabold text-white md:text-4xl">매일 밤 10시의 혜택</h2>
                            <p className="mb-8 text-base leading-relaxed text-indigo-200">
                                한 시간만 열리는 미드나이트 세일.
                                <br />
                                매일 새로운 메뉴를 특별한 가격에 만나보세요.
                            </p>
                            <Link
                                href="/timedeal"
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-8 py-4 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-indigo-600 hover:shadow-indigo-500/30"
                            >
                                <i className="ri-notification-3-line text-lg" />
                                세일 보러 가기
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}

function Stat({ value, suffix, label, divided = false }: { value: string; suffix?: string; label: string; divided?: boolean }) {
    return (
        <div className={divided ? "sm:border-l sm:border-background-200 sm:pl-7 md:pl-9" : ""}>
            <p className="mb-1.5 text-3xl font-bold leading-none text-foreground-950">
                {value}
                {suffix && <span className="text-lg font-semibold">{suffix}</span>}
            </p>
            <p className="text-[10px] text-foreground-400">{label}</p>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    label,
    description,
    dark = false,
}: {
    icon: string;
    title: string;
    label: string;
    description: string;
    dark?: boolean;
}) {
    if (dark) {
        return (
            <div className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/20">
                    <i className={`${icon} text-xl text-indigo-400`} />
                </div>
                <div>
                    <h3 className="mb-0.5 text-sm font-bold text-white">{title}</h3>
                    <p className="mb-1.5 text-xs font-medium text-indigo-400">{label}</p>
                    <p className="text-xs leading-relaxed text-slate-400">{description}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-4 rounded-xl border border-background-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary-600">
                <i className={`${icon} text-xl text-white`} />
            </div>
            <div>
                <h3 className="mb-0.5 text-sm font-bold text-foreground-950">{title}</h3>
                <p className="mb-1.5 text-xs font-medium text-secondary-600">{label}</p>
                <p className="text-xs leading-relaxed text-foreground-500">{description}</p>
            </div>
        </div>
    );
}

function SectionHeader({
    eyebrow,
    title,
    description,
    href,
    linkText,
}: {
    eyebrow: string;
    title: string;
    description: string;
    href: string;
    linkText: string;
}) {
    return (
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <div className="mb-3 flex items-center gap-3">
                    <div className="h-px w-8 bg-accent-500" />
                    <span className="text-xs font-bold text-accent-500">{eyebrow}</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground-950 md:text-3xl">{title}</h2>
                <p className="mt-1.5 text-sm text-foreground-500">{description}</p>
            </div>
            <Link
                href={href}
                className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-foreground-700 transition-colors hover:text-accent-500 sm:self-auto"
            >
                {linkText} <i className="ri-arrow-right-line" />
            </Link>
        </div>
    );
}
