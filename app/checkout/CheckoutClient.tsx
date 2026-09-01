"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../components/Footer";
import { useCart } from "../../components/CartContext";
import { useToast } from "../../components/ToastContext";
import {
    couponStatusLabel,
    couponUnavailableReason,
    formatCouponBenefit,
    formatCouponCondition,
    formatCouponDate,
    getCouponId,
} from "../../lib/coupons";
import { PRODUCT_PLACEHOLDER, won } from "../../lib/products";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "../../lib/shipping";
import type { CartItem, Coupon, CouponValidation, Member } from "../../types/api";

declare global {
    interface Window {
        daum?: {
            Postcode: new (options: { oncomplete: (data: { userSelectedType: string; roadAddress: string; jibunAddress: string; zonecode: string }) => void }) => {
                open: () => void;
            };
        };
    }
}

type DeliveryType = "DAWN" | "NORMAL";

export default function CheckoutClient() {
    const router = useRouter();
    const { refresh } = useCart();
    const { toast } = useToast();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [deliveryType, setDeliveryType] = useState<DeliveryType>("DAWN");
    const [submitting, setSubmitting] = useState(false);
    const [receiverName, setReceiverName] = useState("");
    const [receiverPhone, setReceiverPhone] = useState("");
    const [zipCode, setZipCode] = useState("");
    const [address, setAddress] = useState("");
    const [addressDetail, setAddressDetail] = useState("");
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [couponValidations, setCouponValidations] = useState<CouponValidation[]>([]);
    const [couponLoading, setCouponLoading] = useState(false);
    const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);

    useEffect(() => {
        fetch("/api/members/me", { credentials: "include" })
            .then((res) => (res.ok ? res.json() : null))
            .then((member: Member | null) => {
                if (member?.name) setReceiverName(member.name);
            })
            .catch(() => undefined);
    }, []);

    useEffect(() => {
        const selectedRaw = sessionStorage.getItem("ounce.checkout.selectedCartIds");
        const selectedIds = selectedRaw ? (JSON.parse(selectedRaw) as number[]) : [];

        fetch("/api/carts/items", { credentials: "include" })
            .then((res) => {
                if (res.status === 401) {
                    toast("로그인이 필요한 서비스입니다.", "error");
                    router.push("/login");
                    return null;
                }
                if (!res.ok) throw new Error("장바구니 로드 실패");
                return res.json();
            })
            .then((items: CartItem[] | null) => {
                if (!items) return;
                const filtered = selectedIds.length ? items.filter((item) => selectedIds.includes(item.cartId)) : items;
                if (filtered.length === 0) {
                    toast("장바구니가 비어 있습니다.", "error");
                    router.push("/cart");
                    return;
                }
                setCart(filtered);
            })
            .catch(() => {
                toast("주문 상품을 불러오지 못했습니다.", "error");
            })
            .finally(() => setLoading(false));
    }, [router, toast]);

    const orderAmount = useMemo(() => cart.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0), [cart]);
    const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

    useEffect(() => {
        if (loading || cart.length === 0) return;

        let ignore = false;

        async function loadCoupons() {
            setCouponLoading(true);
            try {
                const [couponRes, availableRes] = await Promise.all([
                    fetch("/api/coupons/me", { credentials: "include" }),
                    fetch(`/api/coupons/me/available?orderAmount=${orderAmount}`, { credentials: "include" }),
                ]);

                if (!couponRes.ok || !availableRes.ok) throw new Error("쿠폰 로드 실패");

                const [nextCoupons, nextValidations] = (await Promise.all([
                    couponRes.json(),
                    availableRes.json(),
                ])) as [Coupon[], CouponValidation[]];

                if (ignore) return;

                setCoupons(nextCoupons);
                setCouponValidations(nextValidations);
                setSelectedCouponId((current) => {
                    if (current === null) return null;
                    return nextValidations.some((coupon) => Number(coupon.couponId) === current && coupon.available) ? current : null;
                });
            } catch {
                if (ignore) return;
                setCoupons([]);
                setCouponValidations([]);
                setSelectedCouponId(null);
            } finally {
                if (!ignore) setCouponLoading(false);
            }
        }

        void loadCoupons();
        return () => {
            ignore = true;
        };
    }, [cart.length, loading, orderAmount]);

    const couponValidationById = useMemo(() => {
        return new Map(couponValidations.map((coupon) => [Number(coupon.couponId), coupon]));
    }, [couponValidations]);

    const availableCouponCount = useMemo(() => {
        return coupons.filter((coupon) => {
            const validation = couponValidationById.get(getCouponId(coupon));
            return validation?.available;
        }).length;
    }, [couponValidationById, coupons]);

    const selectedCouponValidation = selectedCouponId === null ? undefined : couponValidationById.get(selectedCouponId);
    const couponDiscount = selectedCouponValidation?.available ? Number(selectedCouponValidation.discountAmount || 0) : 0;

    const summary = useMemo(() => {
        const shipping = orderAmount === 0 || orderAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
        const freeShippingGap = Math.max(0, FREE_SHIPPING_THRESHOLD - orderAmount);
        const discountedProductTotal = Math.max(orderAmount - couponDiscount, 0);
        return { totalItems, totalPrice: orderAmount, shipping, couponDiscount, finalPrice: discountedProductTotal + shipping, freeShippingGap };
    }, [couponDiscount, orderAmount, totalItems]);

    const searchAddress = () => {
        if (!window.daum?.Postcode) {
            toast("주소 검색 스크립트를 아직 불러오는 중입니다.", "error");
            return;
        }

        new window.daum.Postcode({
            oncomplete: (data) => {
                const nextAddress = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
                setZipCode(data.zonecode);
                setAddress(nextAddress);
                window.setTimeout(() => document.getElementById("receiver-address-detail")?.focus(), 0);
            },
        }).open();
    };

    const placeOrder = async () => {
        if (!receiverName.trim()) {
            toast("받는 분 이름을 입력해주세요.", "error");
            document.getElementById("receiver-name")?.focus();
            return;
        }
        if (!receiverPhone.trim()) {
            toast("연락처를 입력해주세요.", "error");
            document.getElementById("receiver-phone")?.focus();
            return;
        }
        if (!zipCode || !address) {
            toast("주소 검색으로 주소를 선택해주세요.", "error");
            return;
        }
        if (!addressDetail.trim()) {
            toast("상세 주소를 입력해주세요.", "error");
            document.getElementById("receiver-address-detail")?.focus();
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    selectedCartProductIds: cart.map((item) => item.cartId),
                    deliveryType,
                    couponId: selectedCouponId,
                    receiverName: receiverName.trim(),
                    receiverPhone: receiverPhone.trim(),
                    zipCode,
                    address,
                    addressDetail: addressDetail.trim(),
                }),
            });

            if (res.status === 401) {
                toast("로그인이 필요합니다.", "error");
                router.push("/login");
                return;
            }
            if (!res.ok) {
                toast("주문에 실패했습니다. 다시 시도해주세요.", "error");
                return;
            }

            sessionStorage.removeItem("ounce.checkout.selectedCartIds");
            await refresh();
            toast("주문이 완료되었습니다.");
            router.push("/orders");
        } catch {
            toast("주문 처리 중 오류가 발생했습니다.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-background-cream">
            <Script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
            <main className="min-h-screen pb-20 pt-20 md:pt-24">
                <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 lg:px-12">
                    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="mb-3 flex items-center gap-3">
                                <div className="h-px w-8 bg-black" />
                                <span className="text-xs font-bold text-black">CHECKOUT</span>
                            </div>
                            <h1 className="text-xl font-bold text-gray-900 md:text-2xl">결제하기</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                {loading ? "주문 상품을 확인하고 있어요" : `${summary.totalItems}개의 상품 결제를 진행합니다`}
                            </p>
                        </div>
                        <Link
                            href="/cart"
                            className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                        >
                            <i className="ri-arrow-left-line" />
                            장바구니로
                        </Link>
                    </div>

                    <div className="mb-6 grid gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm sm:grid-cols-3">
                        <CheckoutStep icon="ri-shopping-cart-2-line" label="장바구니" state="done" />
                        <CheckoutStep icon="ri-bank-card-line" label="결제 정보" state="active" />
                        <CheckoutStep icon="ri-check-line" label="주문 완료" state="next" />
                    </div>

                    <div className="flex flex-col gap-8 lg:flex-row">
                        <div className="flex flex-1 flex-col gap-5">
                            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
                                <SectionTitle icon="ri-shopping-bag-3-line" title="주문 상품" meta={loading ? undefined : `${cart.length}건`} />
                                <div className="divide-y divide-gray-100 px-4 md:px-5">
                                    {loading ? (
                                        Array.from({ length: 2 }, (_, index) => <div key={index} className="h-24 animate-pulse bg-white py-4" />)
                                    ) : (
                                        cart.map((item) => <OrderItemRow key={item.cartId} item={item} />)
                                    )}
                                </div>
                            </section>

                            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
                                <SectionTitle icon="ri-truck-line" title="배송 방법" meta="필수 선택" />
                                <div className="grid gap-3 px-4 pb-4 md:grid-cols-2 md:px-5 md:pb-5">
                                    <DeliveryOption
                                        value="DAWN"
                                        current={deliveryType}
                                        onChange={setDeliveryType}
                                        icon="ri-moon-line"
                                        title="새벽 배송"
                                        description="밤 10시 마감 · 내일 아침 7시 전 도착"
                                        recommended
                                    />
                                    <DeliveryOption
                                        value="NORMAL"
                                        current={deliveryType}
                                        onChange={setDeliveryType}
                                        icon="ri-truck-line"
                                        title="일반 배송"
                                        description="일반 택배 · 1~2일 소요"
                                    />
                                </div>
                            </section>

                            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
                                <SectionTitle
                                    icon="ri-coupon-3-line"
                                    title="쿠폰"
                                    meta={couponLoading ? "조회 중" : `${availableCouponCount}/${coupons.length}장 사용 가능`}
                                />
                                <div className="px-4 pb-4 md:px-5 md:pb-5">
                                    {couponLoading ? (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {Array.from({ length: 2 }, (_, index) => (
                                                <div key={index} className="h-28 animate-pulse rounded-lg border border-gray-100 bg-gray-50" />
                                            ))}
                                        </div>
                                    ) : coupons.length === 0 ? (
                                        <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-gray-400">
                                                <i className="ri-coupon-3-line text-xl" />
                                            </span>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">보유 쿠폰이 없습니다</p>
                                                <p className="mt-1 text-xs text-gray-500">발급된 쿠폰이 생기면 여기에 표시됩니다.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <label
                                                className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${
                                                    selectedCouponId === null ? "border-[#447861] bg-[#447861]/10" : "border-gray-200 bg-white hover:border-gray-300"
                                                }`}
                                            >
                                                <span className="flex items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name="coupon"
                                                        checked={selectedCouponId === null}
                                                        onChange={() => setSelectedCouponId(null)}
                                                        className="accent-[#447861]"
                                                    />
                                                    <span className="text-sm font-bold text-gray-900">쿠폰 사용 안 함</span>
                                                </span>
                                                <span className="text-xs font-medium text-gray-400">할인 0원</span>
                                            </label>

                                            <div className="grid gap-3 md:grid-cols-2">
                                                {coupons.map((coupon, index) => {
                                                    const couponId = getCouponId(coupon);
                                                    return (
                                                        <CouponOption
                                                            key={couponId || index}
                                                            coupon={coupon}
                                                            orderAmount={summary.totalPrice}
                                                            selected={selectedCouponId === couponId}
                                                            validation={couponValidationById.get(couponId)}
                                                            onSelect={setSelectedCouponId}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
                                <SectionTitle icon="ri-map-pin-line" title="배송지" meta="회원 정보 기준" />
                                <div className="grid gap-3 px-4 pb-4 md:grid-cols-2 md:px-5 md:pb-5">
                                    <Input id="receiver-name" label="받는 분" value={receiverName} onChange={setReceiverName} placeholder="이름" />
                                    <Input id="receiver-phone" label="연락처" value={receiverPhone} onChange={setReceiverPhone} placeholder="010-0000-0000" />
                                    <div className="flex flex-col gap-1.5 md:col-span-2">
                                        <label htmlFor="receiver-zip-code" className="text-xs font-medium text-gray-500">
                                            우편번호
                                        </label>
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <input
                                                id="receiver-zip-code"
                                                type="text"
                                                value={zipCode}
                                                readOnly
                                                placeholder="주소 검색을 눌러주세요"
                                                className="h-12 flex-1 cursor-default rounded-lg border border-gray-200 bg-gray-100 px-4 text-sm text-gray-700 outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={searchAddress}
                                                className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#3b4055] bg-white px-4 text-sm font-semibold text-[#3b4055] transition-colors hover:bg-gray-50"
                                            >
                                                <i className="ri-search-line" /> 주소 검색
                                            </button>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <Input id="receiver-address" label="기본 주소" value={address} onChange={setAddress} placeholder="주소 검색 시 자동 입력됩니다" readOnly />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Input
                                            id="receiver-address-detail"
                                            label="상세 주소"
                                            value={addressDetail}
                                            onChange={setAddressDetail}
                                            placeholder="동·호수 등 상세 주소"
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="w-full shrink-0 lg:w-80">
                            <div className="sticky top-24 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-gray-900">결제 요약</h2>
                                    <span className="text-xs font-medium text-gray-400">{summary.totalItems}개</span>
                                </div>

                                <div className="mb-4 flex flex-col gap-2.5">
                                    <SummaryRow label="상품 금액" value={won(summary.totalPrice)} />
                                    <SummaryRow
                                        label="배송비"
                                        value={summary.shipping === 0 ? "무료" : won(summary.shipping)}
                                        valueClassName={summary.shipping === 0 ? "font-semibold text-[#447861]" : undefined}
                                    />
                                    {summary.couponDiscount > 0 && (
                                        <SummaryRow label="쿠폰 할인" value={`-${won(summary.couponDiscount)}`} valueClassName="font-semibold text-deal-500" />
                                    )}
                                    {!loading && summary.freeShippingGap > 0 && (
                                        <div className="rounded-lg bg-[#447861]/10 px-3 py-2 text-xs font-medium text-[#447861]">
                                            {summary.freeShippingGap.toLocaleString("ko-KR")}원 더 담으면 무료배송
                                        </div>
                                    )}
                                </div>

                                <div className="mb-4 h-px bg-gray-200" />

                                <div className="mb-5 flex items-center justify-between">
                                    <span className="text-sm font-bold text-gray-900">총 결제 금액</span>
                                    <span className="text-xl font-bold text-[#447861]">{won(summary.finalPrice)}</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => void placeOrder()}
                                    disabled={submitting || loading || cart.length === 0}
                                    className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#3b4055] font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <i className={submitting ? "ri-loader-4-line text-lg" : "ri-bank-card-line text-lg"} />
                                    {submitting ? "결제 처리 중..." : `${won(summary.finalPrice)} 결제하기`}
                                </button>

                                <div className="mt-4 flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
                                    <i className="ri-shield-check-line mt-0.5 shrink-0 text-gray-500" />
                                    <p className="text-xs leading-relaxed text-gray-600">주문 완료 후 배송 준비가 시작되면 취소가 어려울 수 있어요.</p>
                                </div>

                                <div className="mt-3 flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
                                    <i className="ri-truck-line mt-0.5 shrink-0 text-gray-500" />
                                    <p className="text-xs leading-relaxed text-gray-600">
                                        <strong className="text-gray-900">새벽배송</strong>
                                        <br />
                                        밤 11시 전 결제 시 다음 회차로 출고됩니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

function CheckoutStep({ icon, label, state }: { icon: string; label: string; state: "done" | "active" | "next" }) {
    const classes = {
        done: "bg-[#447861]/10 text-[#447861]",
        active: "bg-[#3b4055] text-white",
        next: "bg-gray-100 text-gray-400",
    }[state];

    return (
        <div className={`flex h-11 items-center justify-center gap-2 rounded-md px-3 text-xs font-bold sm:text-sm ${classes}`}>
            <i className={`${icon} text-base`} />
            {label}
        </div>
    );
}

function SectionTitle({ icon, title, meta }: { icon: string; title: string; meta?: string }) {
    return (
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 md:px-5">
            <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-[#3b4055]">
                    <i className={`${icon} text-base`} />
                </span>
                <h2 className="text-sm font-bold text-gray-900">{title}</h2>
            </div>
            {meta && <span className="text-xs font-medium text-gray-400">{meta}</span>}
        </div>
    );
}

function CouponOption({
    coupon,
    orderAmount,
    selected,
    validation,
    onSelect,
}: {
    coupon: Coupon;
    orderAmount: number;
    selected: boolean;
    validation?: CouponValidation;
    onSelect: (couponId: number) => void;
}) {
    const couponId = getCouponId(coupon);
    const selectable = couponId > 0 && validation?.available === true;
    const statusTone = selectable ? "bg-[#447861]/10 text-[#447861]" : "bg-gray-100 text-gray-400";

    return (
        <label
            className={`relative flex min-h-32 overflow-hidden rounded-lg border p-4 transition-colors ${
                selectable
                    ? selected
                        ? "cursor-pointer border-[#447861] bg-[#447861]/10"
                        : "cursor-pointer border-gray-200 bg-white hover:border-gray-300"
                    : "cursor-not-allowed border-gray-100 bg-gray-50 opacity-75"
            }`}
        >
            <input
                type="radio"
                name="coupon"
                value={couponId}
                checked={selected}
                disabled={!selectable}
                onChange={() => onSelect(couponId)}
                className="mt-1 shrink-0 accent-[#447861]"
            />
            <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-gray-100 bg-background-cream" />
            <div className="ml-3 min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone}`}>{couponStatusLabel(coupon.status)}</span>
                    <span className="text-xs font-bold text-deal-500">{formatCouponBenefit(coupon)}</span>
                </div>
                <p className="clamp-1 text-sm font-bold text-gray-900">{coupon.name || "쿠폰"}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    {formatCouponCondition(coupon)} · {formatCouponDate(coupon.expiresAt)}까지
                </p>
                <p className={`mt-2 text-xs font-semibold ${selectable ? "text-[#447861]" : "text-gray-400"}`}>
                    {selectable ? `-${won(validation?.discountAmount)} 적용` : couponUnavailableReason(coupon, orderAmount)}
                </p>
            </div>
        </label>
    );
}

function OrderItemRow({ item }: { item: CartItem }) {
    return (
        <div className="flex gap-4 py-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-gray-100 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={item.imageUrl || PRODUCT_PLACEHOLDER}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                        event.currentTarget.src = PRODUCT_PLACEHOLDER;
                    }}
                />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="clamp-2 text-sm font-medium leading-5 text-gray-900">{item.name}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-500">수량 {item.quantity}개</span>
                    {item.timeDeal && <span className="rounded bg-[#447861]/10 px-2 py-1 text-[11px] font-bold text-[#447861]">타임딜</span>}
                </div>
            </div>
            <div className="flex shrink-0 flex-col items-end justify-center gap-1">
                {item.timeDeal && <span className="text-xs text-gray-400 line-through">{won(item.basePrice * item.quantity)}</span>}
                <span className={`text-sm font-bold ${item.timeDeal ? "text-[#447861]" : "text-gray-900"}`}>
                    {won(item.finalPrice * item.quantity)}
                </span>
            </div>
        </div>
    );
}

function DeliveryOption({
    value,
    current,
    onChange,
    icon,
    title,
    description,
    recommended = false,
}: {
    value: DeliveryType;
    current: DeliveryType;
    onChange: (value: DeliveryType) => void;
    icon: string;
    title: string;
    description: string;
    recommended?: boolean;
}) {
    const selected = current === value;
    return (
        <label
            className={`flex min-h-28 cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                selected ? "border-[#447861] bg-[#447861]/10" : "border-gray-200 bg-white hover:border-gray-300"
            }`}
        >
            <input type="radio" name="deliveryType" value={value} checked={selected} onChange={() => onChange(value)} className="mt-1 accent-[#447861]" />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <i className={`${icon} ${selected ? "text-[#447861]" : "text-gray-500"}`} />
                    <span className="text-sm font-bold text-gray-900">{title}</span>
                    {recommended && <span className="rounded-full bg-[#447861] px-2 py-0.5 text-[10px] font-bold text-white">추천</span>}
                </div>
                <p className="mt-1.5 break-keep text-xs leading-relaxed text-gray-500">{description}</p>
            </div>
        </label>
    );
}

function Input({
    id,
    label,
    value,
    onChange,
    placeholder,
    readOnly = false,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    readOnly?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-xs font-medium text-gray-500">
                {label}
            </label>
            <input
                id={id}
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                readOnly={readOnly}
                placeholder={placeholder}
                className={`h-12 w-full rounded-lg border border-gray-200 px-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#447861] focus:ring-2 focus:ring-[#447861]/10 ${
                    readOnly ? "cursor-default bg-gray-100 text-gray-700" : "bg-gray-50"
                }`}
            />
        </div>
    );
}

function SummaryRow({
    label,
    value,
    valueClassName = "font-medium text-gray-800",
}: {
    label: string;
    value: string;
    valueClassName?: string;
}) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className={valueClassName}>{value}</span>
        </div>
    );
}
