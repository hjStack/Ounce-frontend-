"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Footer from "../../components/Footer";
import { useToast } from "../../components/ToastContext";
import { fetchCatalog, PRODUCT_PLACEHOLDER, splitName } from "../../lib/products";
import { MAX_MEALS, MIN_MEALS, planOf, storageDetail } from "../../lib/plan";
import type { Product } from "../../types/api";

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function pickSlots(products: Product[], count: number) {
    const pool = [...products];
    const picked: Product[] = [];
    while (picked.length < count && pool.length > 0) {
        const index = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(index, 1)[0]);
    }
    return picked;
}

export default function SubscribeClient() {
    const { toast } = useToast();
    const [meals, setMeals] = useState(5);
    const [catalog, setCatalog] = useState<Product[]>([]);
    const [slots, setSlots] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [reserveMessage, setReserveMessage] = useState("");
    const selected = useMemo(() => planOf(meals), [meals]);

    useEffect(() => {
        fetchCatalog(80)
            .then((products) => setCatalog(products))
            .catch(() => toast("밀키트 목록을 불러오지 못했습니다.", "error"))
            .finally(() => setLoading(false));
    }, [toast]);

    useEffect(() => {
        setSlots(pickSlots(catalog, selected.meals));
    }, [catalog, selected.meals]);

    const shuffle = () => {
        setSlots(pickSlots(catalog, selected.meals));
    };

    const submitReservation = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nextEmail = email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
            setReserveMessage("이메일 주소를 다시 확인해 주세요.");
            return;
        }

        setSubmitting(true);
        setReserveMessage("접수 중입니다.");
        try {
            const res = await fetch("/api/subscriptions/reservations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email: nextEmail }),
            });
            if (!res.ok) throw new Error("RESERVATION_FAILED");
            setReserveMessage(`사전 예약이 접수됐습니다. 오픈하면 ${nextEmail} 로 알려드릴게요.`);
        } catch {
            setReserveMessage("지금은 접수가 되지 않습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-background-cream">
            <main className="pt-20 md:pt-24">
                <section className="mx-auto flex w-full max-w-7xl flex-col items-start gap-12 px-6 pb-14 pt-8 md:flex-row md:px-8 md:pb-20 md:pt-12 lg:gap-20 lg:px-12">
                    <div className="flex w-full flex-col items-start text-left md:w-1/2">
                        <div className="mb-6 flex items-center gap-4">
                            <div className="h-px w-8 bg-primary-500" />
                            <span className="text-xs font-bold text-primary-500">정기 구독</span>
                        </div>

                        <h1 className="mb-6 text-[2.15rem] font-bold leading-[1.24] text-foreground-950 md:text-5xl lg:text-[3.5rem]">
                            <span className="block">한 주 저녁을</span>
                            <span className="mt-2 block md:mt-3">미리 정해두세요</span>
                        </h1>

                        <p className="mb-8 text-base leading-relaxed text-foreground-600 md:text-lg">
                            일주일에 몇 끼를 받을지 정하고, 그 주에 올 밀키트는 매주 직접 고르면 됩니다.
                        </p>

                        <ul className="mb-10 flex flex-col gap-3.5">
                            <Benefit icon="ri-restaurant-2-line" title="끓인 음식의 질" text="데운 국물이 아니라 냄비에 붓는 시점에 조리가 완성됩니다." />
                            <Benefit icon="ri-calendar-check-line" title="한 주치 끼니 계획" text="개별 상품이 아니라 한 주의 저녁 계획을 대신 세워둡니다." />
                            <Benefit icon="ri-shopping-basket-line" title="결정 비용 제거" text="장보기, 재료 남김, 소비기한 관리가 줄어듭니다." />
                            <Benefit icon="ri-truck-line" title="무료배송" text="4끼 이상 구성은 배송비 없이 받아볼 수 있습니다." />
                        </ul>

                        <p className="text-xs leading-relaxed text-foreground-400">Ounce 구독은 정식 오픈 준비 중입니다. 지금은 사전 예약만 받고 있어요.</p>
                    </div>

                    <div className="w-full md:sticky md:top-28 md:w-1/2">
                        <div className="rounded-2xl border border-background-200 bg-white p-6 shadow-sm md:p-7">
                            <div className="mb-1 flex items-baseline justify-between">
                                <h2 className="text-base font-semibold text-foreground-950">일주일에 몇 끼?</h2>
                                <p className="text-sm">
                                    <span className="text-2xl font-bold tracking-tight text-primary-600">{selected.meals}</span>
                                    <span className="text-sm font-semibold text-foreground-600">끼</span>
                                </p>
                            </div>
                            <p className="mb-5 text-xs text-foreground-400">나중에 언제든 바꿀 수 있습니다.</p>

                            <input
                                type="range"
                                min={MIN_MEALS}
                                max={MAX_MEALS}
                                step={1}
                                value={meals}
                                onChange={(event) => setMeals(Number(event.target.value))}
                                className="meal-range"
                                aria-label="일주일에 받을 끼니 수"
                            />

                            <div className="mb-6 mt-1 grid grid-cols-4">
                                {[4, 5, 6, 7].map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setMeals(value)}
                                        className={`text-center text-xs ${value === selected.meals ? "font-bold text-primary-600" : "text-foreground-400"}`}
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>

                            <div className="mb-2.5 flex items-center gap-2.5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3">
                                <i className={`${selected.storage.icon} text-lg text-primary-600`} />
                                <span className="text-sm font-semibold text-primary-700">{selected.storage.label}</span>
                                <span className="text-foreground-300">·</span>
                                <span className="text-sm text-foreground-600">{selected.storage.note}</span>
                            </div>
                            <p className="mb-6 text-xs leading-relaxed text-foreground-500">{storageDetail(selected.meals)}</p>

                            <div className="rounded-xl bg-foreground-950 p-5 text-white">
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-white/45">사전 예약</p>
                                        <h3 className="mt-1 text-lg font-bold">오픈 알림 받기</h3>
                                    </div>
                                    <i className="ri-mail-send-line text-2xl text-primary-300" />
                                </div>
                                <form className="flex gap-2" onSubmit={submitReservation} noValidate>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder="email@example.com"
                                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/10 px-3.5 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-primary-300"
                                    />
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="shrink-0 rounded-lg bg-primary-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                                    >
                                        예약
                                    </button>
                                </form>
                                {reserveMessage && <p className="mt-3 text-xs leading-relaxed text-white/70">{reserveMessage}</p>}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-7xl px-6 pb-20 md:px-8 lg:px-12">
                    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold text-primary-500">WEEKLY PREVIEW</p>
                            <h2 className="mt-1 text-2xl font-bold text-foreground-950">이번 주 {selected.meals}끼 미리보기</h2>
                        </div>
                        <button
                            type="button"
                            onClick={shuffle}
                            disabled={catalog.length === 0}
                            className="inline-flex items-center gap-2 rounded-lg border border-background-200 bg-white px-4 py-2 text-sm font-semibold text-foreground-700 transition-colors hover:border-primary-200 hover:text-primary-700 disabled:opacity-50"
                        >
                            <i className="ri-shuffle-line" /> 다시 보기
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
                        {loading &&
                            Array.from({ length: selected.meals }, (_, index) => (
                                <div key={index} className="aspect-[4/5] animate-pulse rounded-xl bg-background-200 md:aspect-square" />
                            ))}
                        {!loading && slots.map((product, index) => <PreviewSlot key={`${product.productId}-${index}`} product={product} index={index} />)}
                    </div>

                    {!loading && catalog.length === 0 && (
                        <div className="rounded-xl border border-background-200 bg-white py-12 text-center text-sm text-foreground-500">
                            준비된 밀키트를 불러오지 못했습니다.
                        </div>
                    )}

                    <div className="mt-8 flex justify-center">
                        <Link href="/products" className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-3 text-sm font-bold text-white hover:bg-primary-600">
                            밀키트 먼저 둘러보기 <i className="ri-arrow-right-line" />
                        </Link>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}

function Benefit({ icon, title, text }: { icon: string; title: string; text: string }) {
    return (
        <li className="flex items-start gap-3">
            <i className={`${icon} mt-0.5 text-lg text-primary-500`} />
            <span className="text-sm leading-relaxed text-foreground-700">
                <b className="font-semibold text-foreground-950">{title}</b> · {text}
            </span>
        </li>
    );
}

function PreviewSlot({ product, index }: { product: Product; index: number }) {
    const parts = splitName(product.name);
    return (
        <article className="overflow-hidden rounded-xl border border-background-200 bg-white">
            <div className="relative aspect-square overflow-hidden bg-background-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={product.imageUrl || PRODUCT_PLACEHOLDER}
                    alt={parts.title}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                        event.currentTarget.src = PRODUCT_PLACEHOLDER;
                    }}
                />
                <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[11px] font-bold text-foreground-700 shadow-sm backdrop-blur-sm">
                    {DAY_LABELS[index % 7]}
                </span>
            </div>
            <div className="p-3">
                <h3 className="clamp-2 text-[13px] font-semibold leading-snug text-foreground-950">{parts.title}</h3>
            </div>
        </article>
    );
}
