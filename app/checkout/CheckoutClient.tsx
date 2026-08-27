"use client";

import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../components/Footer";
import { useCart } from "../../components/CartContext";
import { useToast } from "../../components/ToastContext";
import { PRODUCT_PLACEHOLDER, won } from "../../lib/products";
import type { CartItem, Member } from "../../types/api";

declare global {
    interface Window {
        daum?: {
            Postcode: new (options: { oncomplete: (data: { userSelectedType: string; roadAddress: string; jibunAddress: string; zonecode: string }) => void }) => {
                open: () => void;
            };
        };
    }
}

const FREE_SHIPPING_THRESHOLD = 30_000;
const SHIPPING_FEE = 3_000;

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

    const summary = useMemo(() => {
        const totalPrice = cart.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0);
        const shipping = totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
        return { totalPrice, shipping, finalPrice: totalPrice + shipping };
    }, [cart]);

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
        <div className="bg-[#fcfbf9]">
            <Script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
            <main className="min-h-screen pb-20 pt-20 md:pt-24">
                <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 lg:px-12">
                    <div className="mb-8">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="h-px w-8 bg-deal-500" />
                            <span className="text-xs font-bold text-deal-500">CHECKOUT</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">주문서</h1>
                        <p className="mt-1 text-sm text-gray-500">주문 내용을 확인하고 결제를 완료하세요</p>
                    </div>

                    <div className="flex flex-col gap-8 lg:flex-row">
                        <div className="flex flex-1 flex-col gap-6">
                            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                                <h2 className="mb-4 text-sm font-bold text-gray-900">주문 상품</h2>
                                <div className="flex flex-col gap-4">
                                    {loading ? (
                                        <div className="py-8 text-center text-sm text-gray-400">주문 상품을 불러오는 중...</div>
                                    ) : (
                                        cart.map((item) => <OrderItemRow key={item.cartId} item={item} />)
                                    )}
                                </div>
                            </section>

                            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                                <h2 className="mb-4 text-sm font-bold text-gray-900">배송 방법</h2>
                                <div className="flex flex-col gap-3">
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

                            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-gray-900">배송지</h2>
                                    <span className="text-[11px] text-gray-400">회원 정보 기준</span>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <Input id="receiver-name" label="받는 분" value={receiverName} onChange={setReceiverName} placeholder="이름" />
                                    <Input id="receiver-phone" label="연락처" value={receiverPhone} onChange={setReceiverPhone} placeholder="010-0000-0000" />
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-gray-500">우편번호</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={zipCode}
                                                readOnly
                                                placeholder="주소 검색을 눌러주세요"
                                                className="flex-1 cursor-default rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-700 outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={searchAddress}
                                                className="shrink-0 rounded-lg border border-deal-500 px-4 py-3 text-sm font-semibold text-deal-500 transition-colors hover:bg-deal-50"
                                            >
                                                <i className="ri-search-line" /> 주소 검색
                                            </button>
                                        </div>
                                    </div>
                                    <Input id="receiver-address" label="기본 주소" value={address} onChange={setAddress} placeholder="주소 검색 시 자동 입력됩니다" readOnly />
                                    <Input
                                        id="receiver-address-detail"
                                        label="상세 주소"
                                        value={addressDetail}
                                        onChange={setAddressDetail}
                                        placeholder="동·호수 등 상세 주소"
                                    />
                                </div>
                            </section>
                        </div>

                        <div className="w-full shrink-0 lg:w-80">
                            <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                                <h2 className="mb-4 text-sm font-bold text-gray-900">결제 금액</h2>
                                <div className="mb-4 flex flex-col gap-2.5">
                                    <SummaryRow label="상품 금액" value={won(summary.totalPrice)} />
                                    <SummaryRow label="배송비" value={summary.shipping === 0 ? "무료" : won(summary.shipping)} />
                                </div>
                                <div className="mb-4 h-px bg-gray-200" />
                                <div className="mb-5 flex items-center justify-between">
                                    <span className="text-sm font-bold text-gray-900">총 결제 금액</span>
                                    <span className="text-xl font-bold text-deal-500">{won(summary.finalPrice)}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void placeOrder()}
                                    disabled={submitting || loading || cart.length === 0}
                                    className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#3b4055] font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-50"
                                >
                                    {submitting ? "주문 처리 중..." : `${won(summary.finalPrice)} 주문하기`}
                                </button>
                                <div className="mt-4 flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
                                    <i className="ri-shield-check-line mt-0.5 text-gray-500" />
                                    <p className="text-xs leading-relaxed text-gray-600">주문 완료 후 배송이 시작되면 취소가 어려울 수 있어요.</p>
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

function OrderItemRow({ item }: { item: CartItem }) {
    return (
        <div className="flex gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-gray-100 bg-gray-50">
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
                <p className="clamp-1 text-sm font-medium text-gray-900">{item.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">수량 {item.quantity}개</p>
            </div>
            <div className="flex items-center">
                <span className="text-sm font-bold text-gray-900">{won(item.finalPrice * item.quantity)}</span>
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
        <label className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${selected ? "border-deal-500 bg-deal-50" : "border-gray-200"}`}>
            <input type="radio" name="deliveryType" value={value} checked={selected} onChange={() => onChange(value)} className="mt-0.5 accent-deal-500" />
            <div>
                <div className="flex items-center gap-2">
                    <i className={`${icon} ${selected ? "text-deal-500" : "text-gray-500"}`} />
                    <span className="text-sm font-bold text-gray-900">{title}</span>
                    {recommended && <span className="rounded-full bg-deal-500 px-2 py-0.5 text-[10px] font-medium text-white">추천</span>}
                </div>
                <p className="mt-1 text-xs text-gray-500">{description}</p>
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
            <label htmlFor={id} className="text-xs text-gray-500">
                {label}
            </label>
            <input
                id={id}
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                readOnly={readOnly}
                placeholder={placeholder}
                className={`w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-deal-500 focus:ring-2 focus:ring-deal-100 ${
                    readOnly ? "cursor-default bg-gray-100 text-gray-700" : "bg-gray-50"
                }`}
            />
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-800">{value}</span>
        </div>
    );
}
