"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../../components/Footer";
import { useAuth } from "../../../components/AuthContext";
import { useCart } from "../../../components/CartContext";
import { useToast } from "../../../components/ToastContext";
import { formatDate } from "../../../lib/date";
import { getProductPrice, isDiscounted, PRODUCT_PLACEHOLDER, won } from "../../../lib/products";
import type { Product, Review } from "../../../types/api";

type DetailTab = "desc" | "info" | "review";

export default function ProductDetailClient({ productId }: { productId: string }) {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { refresh } = useCart();
    const { toast, confirm } = useToast();

    const [product, setProduct] = useState<Product | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [tab, setTab] = useState<DetailTab>("desc");
    const [reviewOpen, setReviewOpen] = useState(false);
    const [selectedRating, setSelectedRating] = useState(5);
    const [reviewContent, setReviewContent] = useState("");
    const [adding, setAdding] = useState(false);

    const loadReviews = useCallback(async () => {
        try {
            const res = await fetch(`/api/products/${productId}/reviews`, { credentials: "include" });
            if (!res.ok) throw new Error("REVIEW_FETCH_FAILED");
            setReviews((await res.json()) as Review[]);
        } catch {
            setReviews([]);
        }
    }, [productId]);

    useEffect(() => {
        let ignore = false;
        setLoading(true);
        setError("");

        fetch(`/api/products/${productId}`, { credentials: "include" })
            .then((res) => {
                if (!res.ok) throw new Error("NOT_FOUND");
                return res.json();
            })
            .then((data: Product) => {
                if (ignore) return;
                setProduct(data);
                setQuantity(1);
                void loadReviews();
            })
            .catch((err: Error) => {
                if (ignore) return;
                setError(err.message === "NOT_FOUND" ? "존재하지 않는 상품입니다." : "상품을 불러오지 못했습니다.");
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [productId, loadReviews]);

    const isSoldOut = !product || product.status === "SOLD_OUT" || product.stock <= 0;
    const maxQuantity = product ? Math.min(10, Math.max(1, product.stock)) : 10;
    const price = product ? getProductPrice(product) : 0;
    const total = price * quantity;

    const sortedReviews = useMemo(
        () => [...reviews].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
        [reviews],
    );
    const reviewAverage = reviews.length ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : 0;

    const requireLogin = async () => {
        const ok = await confirm("로그인이 필요한 서비스입니다.", {
            kind: "login",
            description: "로그인 후 Ounce의 기능을 사용할 수 있습니다.",
        });
        if (ok) router.push("/login");
    };

    const addToCart = async () => {
        if (adding) return false;
        if (!product || isSoldOut) {
            toast("품절된 상품입니다.", "error");
            return false;
        }
        setAdding(true);

        if (!isAuthenticated) {
            try {
                await requireLogin();
                return false;
            } finally {
                setAdding(false);
            }
        }

        try {
            const res = await fetch(`/api/carts/items?productId=${productId}&quantity=${quantity}`, {
                method: "POST",
                credentials: "include",
            });
            if (res.status === 401) {
                await requireLogin();
                return false;
            }
            if (!res.ok) {
                toast("상품 1개당 최대 10개까지 담을 수 있습니다.", "error");
                return false;
            }
            await refresh();
            return true;
        } catch {
            toast("오류가 발생했습니다.", "error");
            return false;
        } finally {
            setAdding(false);
        }
    };

    const submitReview = async () => {
        const content = reviewContent.trim();
        if (content.length < 5) {
            toast("리뷰 내용을 5자 이상 입력해주세요.", "error");
            return;
        }
        if (!isAuthenticated) {
            await requireLogin();
            return;
        }

        try {
            const res = await fetch(`/api/products/${productId}/reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ rating: selectedRating, content }),
            });
            if (res.status === 401) {
                await requireLogin();
                return;
            }
            if (!res.ok) {
                toast("리뷰 등록에 실패했습니다.", "error");
                return;
            }
            toast("리뷰가 등록되었습니다.");
            setReviewOpen(false);
            setReviewContent("");
            setSelectedRating(5);
            await loadReviews();
        } catch {
            toast("오류가 발생했습니다.", "error");
        }
    };

    const deleteReview = async (reviewId: number) => {
        const ok = await confirm("작성하신 리뷰를 삭제하시겠습니까?", { kind: "delete" });
        if (!ok) return;

        try {
            const res = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE", credentials: "include" });
            if (res.status === 401) {
                await requireLogin();
                return;
            }
            if (res.status === 403) {
                toast("본인이 작성한 리뷰만 삭제할 수 있습니다.", "error");
                return;
            }
            if (!res.ok) {
                toast("리뷰 삭제에 실패했습니다.", "error");
                return;
            }
            toast("리뷰가 삭제되었습니다.");
            await loadReviews();
        } catch {
            toast("오류가 발생했습니다.", "error");
        }
    };

    if (loading) {
        return (
            <div className="bg-background-cream">
                <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-28 text-center md:px-8">
                    <i className="ri-loader-4-line mb-3 block text-4xl text-foreground-400" />
                    <p className="text-sm text-foreground-500">상품 정보를 불러오는 중...</p>
                </main>
                <Footer />
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="bg-background-cream">
                <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-28 text-center md:px-8">
                    <i className="ri-error-warning-line mb-3 block text-4xl text-foreground-400" />
                    <p className="text-sm text-foreground-500">{error || "상품을 불러오지 못했습니다."}</p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-4 rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white"
                    >
                        다시 시도
                    </button>
                </main>
                <Footer />
            </div>
        );
    }

    const specs = [
        ["상품명", product.name],
        ["판매가", won(price)],
        ["중량", product.unit],
        ["원산지", product.origin],
        ["보관방법", product.storage],
        ["유통기한", product.shelfLife],
        ["배송", "새벽배송 (오전 7시 전 도착) / 일반배송 (1~2일)"],
    ].filter(([, value]) => value);

    return (
        <div className="bg-background-cream">
            <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-20 pt-28 md:px-8">
                <nav className="mb-5 flex items-center gap-1.5 text-sm text-foreground-500">
                    <Link href="/products" className="hover:text-foreground-800">
                        상품
                    </Link>
                    <i className="ri-arrow-right-s-line text-foreground-400" />
                    <span>{product.name}</span>
                </nav>

                <div className="grid gap-8 md:grid-cols-[400px_1fr] md:gap-12">
                    <div className="md:sticky md:top-24">
                        <div className="relative mx-auto aspect-square w-full max-w-[400px] overflow-hidden rounded-xl border border-background-200 bg-background-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={product.imageUrl || PRODUCT_PLACEHOLDER}
                                alt={product.name}
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                    event.currentTarget.src = PRODUCT_PLACEHOLDER;
                                }}
                            />
                            {isSoldOut && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                                    <span className="rounded-lg border-2 border-foreground-800 px-5 py-2 text-lg font-extrabold text-foreground-800">
                                        SOLD OUT
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        {product.viewingCount && (
                            <div className="mb-2 flex items-center gap-2 rounded-lg bg-primary-50 px-3.5 py-2.5 text-sm font-semibold text-primary-700">
                                <span className="h-2 w-2 rounded-full bg-primary-500" />
                                지금 {product.viewingCount}명이 이 상품을 보고 있어요
                            </div>
                        )}
                        {product.lastPurchase && (
                            <div className="mb-2 flex items-center gap-2 rounded-lg bg-background-100 px-3.5 py-2.5 text-sm text-foreground-600">
                                <i className="ri-shopping-bag-line" />
                                {product.lastPurchase}
                            </div>
                        )}

                        <div className="mb-3 flex flex-wrap gap-1.5">
                            {product.status === "TIME_DEAL" && <Tag className="bg-deal-500 text-white">타임딜</Tag>}
                            {product.isBest && <Tag className="bg-foreground-950 text-white">베스트</Tag>}
                            {product.expirationDiscountText && <Tag className="bg-primary-500 text-white">{product.expirationDiscountText}</Tag>}
                            {product.unit && <Tag className="bg-background-100 text-foreground-600">{product.unit}</Tag>}
                        </div>

                        <h1 className="text-2xl font-bold leading-snug text-foreground-950 md:text-[26px]">{product.name}</h1>

                        {product.rating != null && (
                            <div className="mt-2.5 flex items-center gap-2">
                                <Stars rating={product.rating} />
                                <span className="text-sm font-bold text-foreground-800">{Number(product.rating).toFixed(1)}</span>
                                <span className="text-sm text-foreground-500">({(product.reviewCount ?? 0).toLocaleString("ko-KR")}개 리뷰)</span>
                            </div>
                        )}

                        <div className="mt-5">
                            {isDiscounted(product) && (
                                <div className="mb-1 flex items-center gap-2 text-sm">
                                    <span className="font-extrabold text-primary-500">{product.discountPercent}%</span>
                                    <span className="text-foreground-400 line-through">{won(product.basePrice)}</span>
                                </div>
                            )}
                            {product.expirationDiscountPercent && product.priceBeforeExpiration && (
                                <div className="mb-1 flex items-center gap-2 text-sm">
                                    <span className="font-extrabold text-deal-500">유통기한 임박 {product.expirationDiscountPercent}% 추가할인</span>
                                    <span className="text-foreground-400 line-through">{won(product.priceBeforeExpiration)}</span>
                                </div>
                            )}
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-primary-500">{won(price)}</span>
                                {product.unit && <span className="text-sm text-foreground-500">/{product.unit}</span>}
                            </div>
                        </div>

                        {isSoldOut ? (
                            <p className="mt-3 text-sm font-semibold text-deal-600">일시 품절된 상품입니다.</p>
                        ) : product.stock <= 10 ? (
                            <p className="mt-3 text-sm font-semibold text-deal-600">
                                <i className="ri-fire-line mr-1" />
                                품절임박 · {product.stock}개 남음
                            </p>
                        ) : null}

                        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {product.origin && <InfoCell label="원산지" value={product.origin} />}
                            <InfoCell label="배송" value="새벽배송 (오전 7시 전 도착) / 일반배송 (1~2일)" />
                            {product.storage && <InfoCell label="보관방법" value={product.storage} />}
                            {product.shelfLife && <InfoCell label="유통기한" value={product.shelfLife} />}
                        </div>

                        <div className="my-5 h-px bg-background-200" />

                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground-700">수량</span>
                            <div className="flex overflow-hidden rounded-lg border border-background-200">
                                <button
                                    type="button"
                                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                                    disabled={quantity <= 1}
                                    className="flex h-10 w-10 items-center justify-center text-foreground-600 transition-colors hover:bg-background-100 disabled:text-foreground-400"
                                >
                                    <i className="ri-subtract-line" />
                                </button>
                                <input
                                    type="number"
                                    value={quantity}
                                    readOnly
                                    className="h-10 w-12 border-x border-background-200 text-center text-sm font-semibold text-foreground-800 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
                                    disabled={quantity >= maxQuantity}
                                    className="flex h-10 w-10 items-center justify-center text-foreground-600 transition-colors hover:bg-background-100 disabled:text-foreground-400"
                                >
                                    <i className="ri-add-line" />
                                </button>
                            </div>
                        </div>

                        <div className="mt-5 flex items-baseline justify-between border-t border-background-200 pt-5">
                            <span className="text-sm text-foreground-600">총 상품금액</span>
                            <span className="text-2xl font-extrabold text-primary-500">{won(total)}</span>
                        </div>

                        <div className="mt-5 flex gap-2.5">
                            {isSoldOut ? (
                                <button className="h-14 w-full rounded-xl bg-background-200 font-bold text-foreground-500" disabled>
                                    품절
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (await addToCart()) toast("장바구니에 담았습니다.");
                                        }}
                                        disabled={adding}
                                        className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border border-background-200 bg-white text-base font-bold text-foreground-700 transition-colors hover:bg-background-50 disabled:cursor-not-allowed disabled:bg-background-100 disabled:text-foreground-400"
                                    >
                                        <i className="ri-shopping-cart-2-line text-xl" />
                                        {adding ? "담는 중" : "장바구니"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (await addToCart()) router.push("/checkout");
                                        }}
                                        disabled={adding}
                                        className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-ink-500 text-base font-bold text-white transition-colors hover:bg-ink-600 disabled:cursor-not-allowed disabled:bg-ink-300"
                                    >
                                        <i className="ri-flashlight-line text-xl" />
                                        {adding ? "처리 중" : "바로 구매"}
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="mt-5 flex gap-3 rounded-xl border border-background-200 bg-background-50 p-4 text-sm text-foreground-600">
                            <i className="ri-truck-line shrink-0 text-lg text-primary-500" />
                            <div>
                                <strong className="text-foreground-800">3만원 이상 무료배송</strong>
                                <p className="mt-0.5 text-foreground-500">오늘 밤 11시 전 주문 시 다음 회차로 출고됩니다.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-14">
                    <div className="flex border-b border-background-200">
                        <TabButton active={tab === "desc"} onClick={() => setTab("desc")}>
                            상품설명
                        </TabButton>
                        <TabButton active={tab === "info"} onClick={() => setTab("info")}>
                            상품정보
                        </TabButton>
                        <TabButton active={tab === "review"} onClick={() => setTab("review")}>
                            리뷰 {reviews.length ? `(${reviews.length})` : ""}
                        </TabButton>
                    </div>

                    {tab === "desc" && (
                        <div className="px-1 py-8">
                            <p className="qna-body text-[15px] leading-8 text-foreground-700">
                                {product.description || "상세 설명이 준비 중입니다."}
                            </p>
                            {product.detailImageUrl && (
                                <div className="mt-6 overflow-hidden rounded-xl border border-background-200">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={product.detailImageUrl} alt="상품 상세 이미지" className="w-full" />
                                </div>
                            )}
                        </div>
                    )}

                    {tab === "info" && (
                        <div className="py-8">
                            <table className="w-full border-t border-foreground-800">
                                <tbody>
                                    {specs.map(([label, value]) => (
                                        <tr key={label} className="border-b border-background-200">
                                            <th className="w-36 bg-background-50 px-4 py-3.5 text-left text-sm font-semibold text-foreground-600">
                                                {label}
                                            </th>
                                            <td className="px-4 py-3.5 text-sm text-foreground-700">{value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {tab === "review" && (
                        <div className="py-8">
                            <div className="mb-5 flex items-center justify-between">
                                <span className="text-sm font-bold text-foreground-800">상품 리뷰</span>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!isAuthenticated) {
                                            await requireLogin();
                                            return;
                                        }
                                        setSelectedRating(5);
                                        setReviewContent("");
                                        setReviewOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary-500 px-4 py-2 text-sm font-semibold text-primary-500 transition-colors hover:bg-primary-50"
                                >
                                    <i className="ri-pencil-line" />
                                    리뷰 작성
                                </button>
                            </div>

                            {reviews.length > 0 ? (
                                <>
                                    <div className="mb-6 flex items-center gap-4 rounded-xl border border-background-200 bg-background-50 p-5">
                                        <div className="text-4xl font-extrabold leading-none text-foreground-950">
                                            {reviewAverage.toFixed(1)}
                                        </div>
                                        <div>
                                            <Stars rating={reviewAverage} />
                                            <div className="mt-1 text-sm text-foreground-500">{reviews.length.toLocaleString("ko-KR")}개 리뷰</div>
                                        </div>
                                    </div>
                                    <div>
                                        {sortedReviews.map((review) => (
                                            <div key={review.reviewId} className="border-b border-background-200 py-5">
                                                <div className="mb-2 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <Stars rating={review.rating} />
                                                        <span className="text-sm font-semibold text-foreground-700">{review.writerName || "익명"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-xs text-foreground-400">{formatDate(review.createdAt)}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => void deleteReview(review.reviewId)}
                                                            className="text-xs text-foreground-400 underline"
                                                        >
                                                            삭제
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="qna-body text-sm leading-relaxed text-foreground-700">{review.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="py-16 text-center text-sm text-foreground-400">
                                    <i className="ri-chat-3-line mb-2 block text-3xl" />
                                    아직 등록된 리뷰가 없습니다.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {reviewOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setReviewOpen(false);
                    }}
                >
                    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-background-200 px-5 py-4">
                            <h3 className="text-base font-bold text-foreground-950">리뷰 작성</h3>
                            <button type="button" onClick={() => setReviewOpen(false)} aria-label="닫기" className="text-2xl text-foreground-500">
                                <i className="ri-close-line" />
                            </button>
                        </div>
                        <div className="p-5">
                            <div className="mb-2 text-sm font-semibold text-foreground-700">별점</div>
                            <div className="mb-5 flex gap-1">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setSelectedRating(value)}
                                        className={`text-3xl ${value <= selectedRating ? "text-yellow-400" : "text-background-300"}`}
                                        aria-label={`${value}점`}
                                    >
                                        <i className="ri-star-fill" />
                                    </button>
                                ))}
                            </div>
                            <div className="mb-2 text-sm font-semibold text-foreground-700">내용</div>
                            <textarea
                                value={reviewContent}
                                onChange={(event) => setReviewContent(event.target.value)}
                                placeholder="상품은 어떠셨나요? 다른 고객에게 도움이 되는 후기를 남겨주세요."
                                className="min-h-32 w-full resize-y rounded-lg border border-background-200 px-3.5 py-3 text-sm leading-relaxed text-foreground-800 outline-none focus:border-primary-500"
                            />
                        </div>
                        <div className="flex gap-2 px-5 pb-5">
                            <button
                                type="button"
                                onClick={() => setReviewOpen(false)}
                                className="h-12 flex-1 rounded-lg border border-background-200 font-bold text-foreground-600 hover:bg-background-50"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => void submitReview()}
                                className="h-12 flex-1 rounded-lg bg-primary-500 font-bold text-white hover:bg-primary-600"
                            >
                                등록
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}

function Tag({ className, children }: { className: string; children: ReactNode }) {
    return <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${className}`}>{children}</span>;
}

function InfoCell({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="mb-1 text-xs text-foreground-400">{label}</div>
            <div className="text-sm font-medium text-foreground-700">{value}</div>
        </div>
    );
}

function Stars({ rating }: { rating: number }) {
    return (
        <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map((index) => (
                <i key={index} className={`${index < Math.round(rating) ? "ri-star-fill" : "ri-star-line"} text-sm text-yellow-400`} />
            ))}
        </div>
    );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`relative flex-1 py-4 text-sm font-semibold transition-colors ${
                active ? "text-foreground-950 after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-foreground-950" : "text-foreground-500"
            }`}
        >
            {children}
        </button>
    );
}
