"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Footer from "../../components/Footer";
import ProductCard, { ProductSkeleton } from "../../components/ProductCard";
import { CATEGORIES, fetchCategoryCounts, fetchProducts } from "../../lib/products";
import type { Product } from "../../types/api";

const PAGE_SIZE = 10;

const SORTS = [
    { key: "new", label: "신상품순" },
    { key: "price-asc", label: "낮은 가격순" },
    { key: "price-desc", label: "높은 가격순" },
    { key: "name", label: "이름순" },
];

export default function ProductsClient() {
    const searchParams = useSearchParams();
    const searchQuery = searchParams.toString();
    const [keyword, setKeyword] = useState("");
    const [category, setCategory] = useState("all");
    const [sort, setSort] = useState("new");
    const [page, setPage] = useState(0);
    const [products, setProducts] = useState<Product[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [hasNext, setHasNext] = useState(false);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("");

    useEffect(() => {
        const params = new URLSearchParams(searchQuery);
        const nextKeyword = (params.get("keyword") || "").trim();
        const nextCategory = params.get("categories") || "all";
        const nextSort = params.get("sort") || "new";

        setKeyword((current) => (current === nextKeyword ? current : nextKeyword));
        setCategory((current) => (current === nextCategory ? current : nextCategory));
        setSort((current) => (current === nextSort ? current : nextSort));
        setPage((current) => (current === 0 ? current : 0));
    }, [searchQuery]);

    const syncUrl = useCallback((nextCategory: string, nextKeyword: string, nextSort: string) => {
        const next = new URLSearchParams();
        if (nextCategory !== "all") next.set("categories", nextCategory);
        if (nextKeyword) next.set("keyword", nextKeyword);
        if (nextSort !== "new") next.set("sort", nextSort);
        const qs = next.toString();
        window.history.replaceState(null, "", qs ? `/products?${qs}` : "/products");
    }, []);

    const load = useCallback(
        async (append: boolean, nextPage: number) => {
            setLoading(true);
            if (!append) {
                setProducts([]);
                setStatus("");
            }

            try {
                const response = await fetchProducts({
                    categories: category,
                    keyword,
                    sort,
                    page: nextPage,
                    size: PAGE_SIZE,
                });
                const items = response.products ?? [];
                setProducts((current) => (append ? [...current, ...items] : items));
                setHasNext(Boolean(response.hasNext));
                if (!append && items.length === 0) {
                    setStatus(keyword ? `'${keyword}' 검색 결과가 없습니다.` : "해당 카테고리에 상품이 없습니다.");
                }
            } catch {
                setStatus(append ? "더 불러오지 못했습니다." : "밀키트를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.");
                if (append) setPage((current) => Math.max(0, current - 1));
            } finally {
                setLoading(false);
            }
        },
        [category, keyword, sort],
    );

    useEffect(() => {
        void load(false, 0);
    }, [load]);

    useEffect(() => {
        fetchCategoryCounts(keyword)
            .then(setCounts)
            .catch(() => setCounts({}))
    }, [keyword]);

    const title = keyword ? `'${keyword}' 검색 결과` : CATEGORIES.find((item) => item.key === category)?.label ?? "든든한 한 끼";
    const subtitle = keyword
        ? "이름과 설명에서 찾았습니다"
        : category !== "all"
          ? "손질·계량 끝난 1인분, 내일 새벽 7시 도착"
          : "자취생 맞춤 1인분 밀키트, 내일 새벽 문 앞 도착";
    const total = counts[category] ?? 0;

    return (
        <div className="bg-background-cream">
            <main className="min-h-screen pb-20 pt-20 md:pt-24">
                <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8 lg:px-12">
                    <div className="mb-7">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="h-px w-8 bg-accent-500" />
                            <span className="text-xs font-bold text-accent-500">Meal Kits</span>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground-950 md:text-3xl">{title}</h1>
                        <p className="mt-1.5 text-sm text-foreground-500">{subtitle}</p>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        {[{ key: "all", label: "전체", icon: "ri-grid-line" }, ...CATEGORIES].map((item) => {
                            const active = item.key === category;
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => {
                                        if (item.key === category) return;
                                        setCategory(item.key);
                                        setPage(0);
                                        syncUrl(item.key, keyword, sort);
                                    }}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                                        active
                                            ? "border-accent-500 bg-accent-500 text-white shadow-sm"
                                            : "border-background-200 bg-white text-foreground-600 hover:border-accent-500 hover:text-accent-500"
                                    }`}
                                >
                                    <i className={item.icon} />
                                    {item.label}
                                    <span className={`text-xs ${active ? "text-white/70" : "text-foreground-400"}`}>
                                        {counts[item.key] ?? 0}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-background-200 pb-4">
                        <p className="text-sm text-foreground-500">
                            {keyword ? `'${keyword}' 검색 결과 ${total}종` : `총 ${total}종`}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <label htmlFor="sort-select" className="text-xs text-foreground-400">
                                정렬
                            </label>
                            <select
                                id="sort-select"
                                value={sort}
                                onChange={(event) => {
                                    setSort(event.target.value);
                                    setPage(0);
                                    syncUrl(category, keyword, event.target.value);
                                }}
                                className="cursor-pointer rounded-lg border border-background-200 bg-white px-3 py-2 text-sm text-foreground-700 focus:border-accent-500 focus:outline-none"
                            >
                                {SORTS.map((item) => (
                                    <option key={item.key} value={item.key}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {loading && products.length === 0
                            ? Array.from({ length: PAGE_SIZE }, (_, index) => <ProductSkeleton key={index} />)
                            : products.map((product) => <ProductCard key={product.productId} product={product} />)}
                    </div>

                    {status && (
                        <div className="py-20 text-center text-sm text-foreground-400">
                            <p className="text-foreground-600">{status}</p>
                            {keyword && (
                                <a href="/products" className="mt-3 inline-block text-sm font-semibold text-accent-500 hover:underline">
                                    전체 밀키트 보기
                                </a>
                            )}
                        </div>
                    )}

                    <div className="mt-10 flex justify-center">
                        {hasNext && (
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => {
                                    const nextPage = page + 1;
                                    setPage(nextPage);
                                    void load(true, nextPage);
                                }}
                                className="rounded-lg border border-background-200 bg-white px-8 py-3 text-sm font-semibold text-foreground-700 shadow-sm transition-colors hover:bg-background-100 disabled:opacity-50"
                            >
                                더보기
                            </button>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
