"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../components/Footer";
import { useAuth } from "../../components/AuthContext";
import { useCart } from "../../components/CartContext";
import { useToast } from "../../components/ToastContext";
import { getProductPrice, isDiscounted, PRODUCT_PLACEHOLDER, splitName, won } from "../../lib/products";
import type { Product } from "../../types/api";

type SortKey = "popular" | "discount" | "price";

const SORTS: Array<{ key: SortKey; label: string }> = [
    { key: "popular", label: "인기순" },
    { key: "discount", label: "할인율순" },
    { key: "price", label: "낮은 가격순" },
];

export default function TimeDealClient() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState<SortKey>("popular");
    const [timer, setTimer] = useState({ hours: "00", minutes: "00", seconds: "00", active: false });

    useEffect(() => {
        fetch("/api/timedeal", { credentials: "include" })
            .then((res) => {
                if (!res.ok) throw new Error("TIME_DEAL_FAILED");
                return res.json();
            })
            .then((data: Product[]) => setProducts(data))
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const tick = () => {
            const now = new Date();
            const open = new Date(now);
            open.setHours(22, 0, 0, 0);
            const close = new Date(now);
            close.setHours(23, 0, 0, 0);

            const active = now >= open && now < close;
            const target = active ? close : open;
            if (now >= close) target.setDate(target.getDate() + 1);

            const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
            const hours = Math.floor(diff / 3600);
            const minutes = Math.floor((diff % 3600) / 60);
            const seconds = diff % 60;
            setTimer({
                hours: String(hours).padStart(2, "0"),
                minutes: String(minutes).padStart(2, "0"),
                seconds: String(seconds).padStart(2, "0"),
                active,
            });
        };

        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, []);

    const sortedProducts = useMemo(() => {
        const copy = [...products];
        if (sort === "discount") {
            copy.sort((a, b) => Number(b.discountPercent || 0) - Number(a.discountPercent || 0));
        } else if (sort === "price") {
            copy.sort((a, b) => getProductPrice(a) - getProductPrice(b));
        }
        return copy;
    }, [products, sort]);

    return (
        <div className="min-h-screen bg-foreground-950 text-white">
            <main className="pt-20 md:pt-24">
                <section className="relative flex min-h-[360px] flex-col items-center justify-center overflow-hidden px-4 text-center">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(239,68,68,0.25),transparent_42%),linear-gradient(180deg,#111827,#030712)]" />
                    <div className="relative z-10">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                            <i className="ri-moon-fill text-deal-400" />
                            매일 22:00-23:00
                        </div>
                        <h1 className="mb-3 text-4xl font-semibold md:text-6xl">Midnight Sale</h1>
                        <p className="mb-8 text-sm text-white/55 md:text-base">
                            {timer.active ? "오늘의 한정 수량이 열려 있습니다." : "다음 미드나이트 세일까지 남은 시간"}
                        </p>
                        <div className="flex items-center justify-center gap-4 md:gap-6">
                            <TimerBox value={timer.hours} label="시간" />
                            <span className="text-2xl font-light text-white/20">:</span>
                            <TimerBox value={timer.minutes} label="분" />
                            <span className="text-2xl font-light text-white/20">:</span>
                            <TimerBox value={timer.seconds} label="초" accent />
                        </div>
                    </div>
                </section>

                <section className="px-4 py-8 md:px-8 lg:px-12">
                    <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
                        <span className="mr-2 shrink-0 text-sm text-white/40">정렬:</span>
                        {SORTS.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setSort(item.key)}
                                className={`shrink-0 rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
                                    sort === item.key ? "bg-deal-500 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {loading && (
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                            {Array.from({ length: 8 }, (_, index) => (
                                <div key={index} className="h-72 animate-pulse rounded-lg border border-white/5 bg-white/5" />
                            ))}
                        </div>
                    )}

                    {!loading && sortedProducts.length === 0 && (
                        <div className="flex w-full flex-col items-center justify-center py-20 text-center">
                            <i className="ri-moon-clear-line mb-4 text-6xl text-white/20" />
                            <h2 className="text-xl font-medium text-white/80">지금은 미드나이트 세일 준비 중입니다</h2>
                            <p className="mt-2 text-sm text-white/40">오늘 밤 10시, 한정 특가 상품이 공개됩니다.</p>
                        </div>
                    )}

                    {!loading && sortedProducts.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                            {sortedProducts.map((product) => (
                                <TimeDealCard key={product.productId} product={product} />
                            ))}
                        </div>
                    )}
                </section>
            </main>
            <Footer />
        </div>
    );
}

function TimeDealCard({ product }: { product: Product }) {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { refresh } = useCart();
    const { toast, confirm } = useToast();
    const [adding, setAdding] = useState(false);
    const parts = splitName(product.name);
    const price = getProductPrice(product);
    const remaining = Math.max(0, Number(product.stock || 0));
    const totalStock = Math.max(50, remaining);
    const sold = Math.max(totalStock - remaining, 0);
    const progress = Math.min((sold / totalStock) * 100, 100);
    const soldOut = remaining <= 0 || product.status === "SOLD_OUT";

    const addToCart = async () => {
        if (adding || soldOut) return;
        setAdding(true);

        try {
            if (!isAuthenticated) {
                const ok = await confirm("로그인이 필요합니다.", { kind: "login", description: "로그인 후 미드나이트 상품을 담을 수 있습니다." });
                if (ok) router.push("/login");
                return;
            }

            const res = await fetch(`/api/carts/items?productId=${product.productId}&quantity=1`, { method: "POST", credentials: "include" });
            if (res.status === 401) {
                router.push("/login");
                return;
            }
            if (!res.ok) {
                toast("장바구니 담기에 실패했습니다.", "error");
                return;
            }
            await refresh();
            toast("장바구니에 담았습니다.");
        } catch {
            toast("네트워크 오류가 발생했습니다.", "error");
        } finally {
            setAdding(false);
        }
    };

    return (
        <article className="overflow-hidden rounded-lg border border-white/5 bg-foreground-900/60 transition-colors hover:border-deal-400/30">
            <Link href={`/products-detail/${product.productId}`} className="relative block aspect-square overflow-hidden bg-foreground-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={product.imageUrl || PRODUCT_PLACEHOLDER}
                    alt={parts.title}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                        event.currentTarget.src = PRODUCT_PLACEHOLDER;
                    }}
                />
                {soldOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground-950/70">
                        <span className="rounded-md bg-foreground-800 px-5 py-2.5 font-bold">품절</span>
                    </div>
                )}
            </Link>
            <div className="p-4">
                <h2 className="clamp-2 min-h-10 text-sm font-medium">{parts.title}</h2>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                    <span className="text-xl font-bold text-deal-400">{won(price)}</span>
                    {isDiscounted(product) && <span className="text-sm text-white/40 line-through">{won(product.basePrice)}</span>}
                </div>
                <div className="mt-3">
                    <div className="mb-1.5 flex justify-between text-xs">
                        <span className="text-white/70">{soldOut ? "판매 완료" : `재고 ${remaining}개 남음`}</span>
                        <span className="text-white/40">
                            {sold}/{totalStock}
                        </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-deal-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => void addToCart()}
                    disabled={soldOut || adding}
                    className="mt-3 w-full rounded-md bg-deal-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deal-400 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-white/30"
                >
                    {soldOut ? "품절" : adding ? "담는 중..." : "장바구니에 담기"}
                </button>
            </div>
        </article>
    );
}

function TimerBox({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
    return (
        <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-sm border border-white/10 bg-white/5">
                <span className={`text-2xl font-semibold ${accent ? "text-deal-400" : ""}`}>{value}</span>
            </div>
            <span className="mt-2 text-xs text-white/40">{label}</span>
        </div>
    );
}
