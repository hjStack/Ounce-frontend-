"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../components/Footer";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/ToastContext";
import { couponStatusLabel, formatCouponBenefit, formatCouponCondition, formatCouponDate, getCouponId } from "../../lib/coupons";
import { won } from "../../lib/products";
import type { Coupon, Member, Order } from "../../types/api";

const WITHDRAW_TEXT = "ounce를 탈퇴합니다.";

export default function AccountClient() {
    const router = useRouter();
    const { logout, refresh } = useAuth();
    const { toast } = useToast();
    const [member, setMember] = useState<Member | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [withdrawOpen, setWithdrawOpen] = useState(false);
    const [withdrawText, setWithdrawText] = useState("");
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let ignore = false;

        async function load() {
            try {
                const me = await fetch("/api/members/me", { credentials: "include" });
                if (me.status === 401) {
                    toast("로그인이 필요한 페이지입니다.", "error");
                    router.push("/login");
                    return;
                }
                if (!me.ok) throw new Error("MEMBER_FAILED");
                const data = (await me.json()) as Member;
                if (!ignore) setMember(data);

                const [orderRes, couponRes] = await Promise.all([
                    fetch("/api/orders", { credentials: "include" }),
                    fetch("/api/coupons/me", { credentials: "include" }),
                ]);
                if (!ignore && orderRes.ok) setOrders((await orderRes.json()) as Order[]);
                if (!ignore && couponRes.ok) setCoupons((await couponRes.json()) as Coupon[]);
            } catch {
                if (!ignore) toast("계정 정보를 불러오지 못했습니다.", "error");
            } finally {
                if (!ignore) setLoading(false);
            }
        }

        void load();
        return () => {
            ignore = true;
        };
    }, [router, toast]);

    const availableCouponCount = useMemo(() => coupons.filter((coupon) => coupon.status === "AVAILABLE").length, [coupons]);

    const stats = useMemo(() => {
        const delivered = orders.filter((order) => order.status === "DELIVERED").length;
        const spent = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
        return [
            { label: "총 주문", value: `${orders.length}건` },
            { label: "누적 결제", value: won(spent) },
            { label: "배송 완료", value: `${delivered}건` },
            { label: "사용 가능 쿠폰", value: `${availableCouponCount}장`, accent: true },
        ];
    }, [availableCouponCount, orders]);

    const name = member?.name || "사용자";
    const initial = name.charAt(0).toUpperCase();

    const withdraw = async () => {
        if (withdrawText.trim() !== WITHDRAW_TEXT) return;
        setDeleting(true);
        try {
            const res = await fetch("/api/members/me", { method: "DELETE", credentials: "include" });
            if (!res.ok && res.status !== 204) {
                toast("회원 탈퇴에 실패했습니다.", "error");
                return;
            }
            toast("회원 탈퇴가 완료되었습니다.");
            await logout();
            await refresh();
            router.push("/");
        } catch {
            toast("서버와의 통신에 실패했습니다.", "error");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="bg-[#fcfbf9]">
            <main className="min-h-screen pt-20 md:pt-24">
                <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 lg:px-12">
                    <div className="mb-8">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="h-px w-8 bg-deal-500" />
                            <span className="text-xs font-bold text-deal-500">MY ACCOUNT</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">내 계정</h1>
                        <p className="mt-1 text-sm text-gray-500">Ounce와 함께한 여정</p>
                    </div>

                    <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                        {stats.map((item) => (
                            <div key={item.label} className="rounded-xl border border-gray-100 bg-white p-5">
                                <div className="mb-1.5 text-xs text-gray-400">{item.label}</div>
                                <div className={`text-2xl font-bold ${item.accent ? "text-deal-500" : "text-gray-900"}`}>{loading ? "-" : item.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-6 lg:flex-row">
                        <aside className="w-full shrink-0 lg:w-80">
                            <section className="rounded-xl border border-gray-100 bg-white p-6">
                                <div className="mb-5 flex items-center gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-xl font-bold text-white">{initial}</div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-gray-900">{name}님</div>
                                        <div className="truncate text-xs text-gray-400">{member?.email || "로그인 정보 확인 중"}</div>
                                    </div>
                                </div>

                                <div className="mb-4 h-px bg-gray-100" />

                                <div className="flex flex-col gap-3">
                                    <DetailRow label="이름" value={member?.name || "-"} />
                                    <DetailRow label="이메일" value={member?.email || "-"} />
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-400">회원 등급</span>
                                        <span className="rounded-full bg-[#fdf0e8] px-2.5 py-0.5 text-xs font-medium text-deal-500">{member?.grade || "BASIC"}</span>
                                    </div>
                                    <DetailRow label="포인트" value={`${Number(member?.point || 0).toLocaleString("ko-KR")}P`} strong />
                                </div>
                            </section>

                            <section className="mt-4 rounded-xl border border-gray-100 bg-white p-5">
                                <div className="mb-3 text-xs font-bold text-gray-900">바로가기</div>
                                <div className="flex flex-col gap-1">
                                    <QuickLink href="/orders" icon="ri-file-list-3-line" label="주문 내역" />
                                    <QuickLink href="/cart" icon="ri-shopping-cart-2-line" label="장바구니" />
                                    <QuickLink href="#account-coupons" icon="ri-coupon-3-line" label="쿠폰함" />
                                    <QuickLink href="/products" icon="ri-store-line" label="상품 둘러보기" />
                                </div>
                            </section>

                            <button
                                type="button"
                                onClick={() => setWithdrawOpen(true)}
                                className="mt-6 inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-red-500"
                            >
                                <i className="ri-logout-box-r-line" /> 회원 탈퇴
                            </button>
                        </aside>

                        <section className="flex-1">
                            <div id="account-coupons" className="mb-8 scroll-mt-24">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-gray-900">보유 쿠폰</h2>
                                    <span className="text-xs font-medium text-gray-400">사용 가능 {availableCouponCount}장</span>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    {loading &&
                                        Array.from({ length: 2 }, (_, index) => (
                                            <div key={index} className="h-32 animate-pulse rounded-xl border border-gray-100 bg-white" />
                                        ))}
                                    {!loading &&
                                        coupons.map((coupon, index) => (
                                            <AccountCouponCard key={getCouponId(coupon) || index} coupon={coupon} />
                                        ))}
                                    {!loading && coupons.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-400 md:col-span-2">
                                            보유한 쿠폰이 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-gray-900">최근 주문</h2>
                                    <Link href="/orders" className="text-xs text-gray-500 transition-colors hover:text-gray-900">
                                        전체 보기
                                    </Link>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {loading &&
                                        Array.from({ length: 3 }, (_, index) => (
                                            <div key={index} className="h-20 animate-pulse rounded-xl border border-gray-100 bg-white" />
                                        ))}
                                    {!loading &&
                                        orders.slice(0, 5).map((order) => (
                                            <Link
                                                key={order.orderId}
                                                href="/orders"
                                                className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 transition-colors hover:border-gray-200"
                                            >
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">ORD-{String(order.orderId).padStart(6, "0")}</p>
                                                    <p className="mt-1 text-xs text-gray-400">{order.status}</p>
                                                </div>
                                                <p className="text-sm font-bold text-gray-900">{won(order.totalAmount)}</p>
                                            </Link>
                                        ))}
                                    {!loading && orders.length === 0 && (
                                        <div className="rounded-xl border border-gray-100 bg-white py-16 text-center text-sm text-gray-400">아직 주문 내역이 없습니다.</div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {withdrawOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                            <i className="ri-error-warning-line text-2xl text-red-500" />
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-gray-900">정말 탈퇴하시겠어요?</h3>
                        <p className="mb-5 text-sm leading-relaxed text-gray-500">
                            탈퇴 시 주문 내역, 포인트, 쿠폰, 장바구니 등 모든 정보가 삭제되며 복구할 수 없습니다.
                        </p>
                        <div className="mb-5">
                            <p className="mb-2 text-sm text-gray-600">
                                계속하시려면 <span className="font-bold text-red-500">{WITHDRAW_TEXT}</span>를 입력해주세요.
                            </p>
                            <input
                                type="text"
                                value={withdrawText}
                                onChange={(event) => setWithdrawText(event.target.value)}
                                placeholder={WITHDRAW_TEXT}
                                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setWithdrawOpen(false);
                                    setWithdrawText("");
                                }}
                                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => void withdraw()}
                                disabled={withdrawText.trim() !== WITHDRAW_TEXT || deleting}
                                className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-200"
                            >
                                {deleting ? "처리 중" : "탈퇴하기"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}

function DetailRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-gray-400">{label}</span>
            <span className={strong ? "font-bold text-gray-900" : "font-medium text-gray-800"}>{value}</span>
        </div>
    );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
    return (
        <Link href={href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50">
            <i className={`${icon} text-gray-400`} /> {label}
        </Link>
    );
}

function AccountCouponCard({ coupon }: { coupon: Coupon }) {
    const available = coupon.status === "AVAILABLE";
    const statusClassName = available
        ? "bg-[#447861]/10 text-[#447861]"
        : coupon.status === "USED"
          ? "bg-gray-100 text-gray-400"
          : "bg-deal-50 text-deal-500";

    return (
        <div className={`relative overflow-hidden rounded-xl border bg-white p-4 ${available ? "border-[#447861]/20" : "border-gray-100"}`}>
            <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-gray-100 bg-[#fcfbf9]" />
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-lg font-bold text-deal-500">{formatCouponBenefit(coupon)}</p>
                    <p className="mt-1 clamp-1 text-sm font-bold text-gray-900">{coupon.name || "쿠폰"}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClassName}`}>{couponStatusLabel(coupon.status)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span>{formatCouponCondition(coupon)}</span>
                <span>{formatCouponDate(coupon.expiresAt)}까지</span>
            </div>
        </div>
    );
}
