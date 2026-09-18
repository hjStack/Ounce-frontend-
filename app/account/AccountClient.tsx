"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../components/Footer";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/ToastContext";
import {
  couponStatusLabel,
  formatCouponBenefit,
  formatCouponCondition,
  formatCouponDate,
  getCouponId,
} from "../../lib/coupons";
import { formatDate } from "../../lib/date";
import { won } from "../../lib/products";
import {
  forgetSignupBenefitToastSeen,
  markSignupBenefitWithdrawal,
  signupBenefitMemberKey,
} from "../../lib/signup-benefits";
import type { Coupon, Member, Order, PointHistory } from "../../types/api";
import { apiFetch } from "@/lib/api";

const WITHDRAW_TEXT = "ounce를 탈퇴합니다.";

type PointHistoryResponse = {
  content?: PointHistory[];
  items?: PointHistory[];
  data?: PointHistory[];
  histories?: PointHistory[];
  pointHistories?: PointHistory[];
};

function readPointHistory(data: unknown): PointHistory[] {
  if (Array.isArray(data)) return data as PointHistory[];
  if (!data || typeof data !== "object") return [];

  const response = data as PointHistoryResponse;
  return (
    response.content ??
    response.items ??
    response.data ??
    response.histories ??
    response.pointHistories ??
    []
  );
}

export default function AccountClient() {
  const router = useRouter();
  const { logout, refresh } = useAuth();
  const { toast } = useToast();
  const [member, setMember] = useState<Member | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawText, setWithdrawText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const me = await apiFetch("/api/members/me", {
          credentials: "include",
        });
        if (me.status === 401) {
          toast("로그인이 필요한 페이지입니다.", "error");
          router.push("/login");
          return;
        }
        if (!me.ok) throw new Error("MEMBER_FAILED");
        const data = (await me.json()) as Member;
        if (!ignore) setMember(data);

        const [orderRes, couponRes, pointRes] = await Promise.all([
          apiFetch("/api/orders", { credentials: "include" }),
          apiFetch("/api/coupons/me", { credentials: "include" }),
          apiFetch("/api/points/me/histories?page=0&size=20", {
            credentials: "include",
          }),
        ]);
        if (!ignore && orderRes.ok)
          setOrders((await orderRes.json()) as Order[]);
        if (!ignore && couponRes.ok)
          setCoupons((await couponRes.json()) as Coupon[]);
        if (!ignore && pointRes.ok) {
          const pointData: unknown = await pointRes.json();
          setPointHistory(readPointHistory(pointData));
        }
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

  const availableCouponCount = useMemo(
    () => coupons.filter((coupon) => coupon.status === "AVAILABLE").length,
    [coupons],
  );

  const orderStats = useMemo(() => {
    const delivered = orders.filter(
      (order) => order.status === "DELIVERED",
    ).length;
    const spent = orders.reduce(
      (sum, order) => sum + Number(order.totalAmount || 0),
      0,
    );
    return [
      {
        label: "총 주문",
        value: `${orders.length}건`,
        icon: "ri-file-list-3-line",
      },
      { label: "누적 결제", value: won(spent), icon: "ri-wallet-3-line" },
      { label: "배송 완료", value: `${delivered}건`, icon: "ri-truck-line" },
    ];
  }, [orders]);

  const name = member?.name || (loading ? "확인 중" : "사용자");
  const email = member?.email || (loading ? "로그인 정보 확인 중" : "-");
  const grade = member?.grade || "BASIC";
  const pointLabel = `${Number(member?.point || 0).toLocaleString("ko-KR")}P`;
  const couponCountLabel = loading ? "확인 중" : `${coupons.length}장`;
  const availableCouponLabel = loading
    ? "확인 중"
    : `${availableCouponCount}장 사용 가능`;
  const initial = name.charAt(0).toUpperCase();

  const withdraw = async () => {
    if (withdrawText.trim() !== WITHDRAW_TEXT) return;
    setDeleting(true);
    try {
      const res = await apiFetch("/api/members/me", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) {
        toast("회원 탈퇴에 실패했습니다.", "error");
        return;
      }
      if (member) {
        forgetSignupBenefitToastSeen(signupBenefitMemberKey(member));
        markSignupBenefitWithdrawal(member);
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
    <div className="bg-background-cream">
      <main className="min-h-screen pt-20 md:pt-24">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12 lg:px-12">
          <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px w-8 bg-primary-500" />
                <span className="text-xs font-bold text-primary-700">
                  MY OUNCE
                </span>
              </div>
              <h1 className="text-3xl font-black leading-tight text-foreground-950 md:text-4xl">
                내 계정
              </h1>
              <p className="mt-2 break-keep text-sm font-medium text-foreground-700">
                회원 정보와 혜택, 쿠폰을 한 화면에서 확인하세요.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <AccountActionLink
                href="/orders"
                icon="ri-file-list-3-line"
                label="주문 내역"
              />
              <AccountActionLink
                href="/cart"
                icon="ri-shopping-cart-2-line"
                label="장바구니"
              />
              <AccountActionLink
                href="/products"
                icon="ri-store-line"
                label="밀키트 보기"
              />
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-xl border border-background-200 bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-ink-500 text-2xl font-black text-white">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-primary-700">
                      회원 정보
                    </p>
                    <h2 className="mt-1 truncate text-2xl font-black text-foreground-950">
                      {name}님
                    </h2>
                    <p className="mt-1 truncate text-sm font-medium text-foreground-700">
                      {email}
                    </p>
                  </div>
                </div>

                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-extrabold text-primary-700">
                  <i className="ri-vip-crown-line text-sm" />
                  {grade}
                </span>
              </div>

              <dl className="mt-7 grid gap-x-8 gap-y-5 border-t border-background-200 pt-6 sm:grid-cols-2">
                <AccountDetail
                  icon="ri-user-smile-line"
                  label="이름"
                  value={name}
                />
                <AccountDetail
                  icon="ri-mail-line"
                  label="이메일"
                  value={email}
                />
                <AccountDetail
                  icon="ri-vip-crown-line"
                  label="회원등급"
                  value={grade}
                  accent
                />
                <AccountDetail
                  icon="ri-coin-line"
                  label="포인트"
                  value={pointLabel}
                  accent
                />
                <AccountDetail
                  icon="ri-coupon-3-line"
                  label="보유 쿠폰"
                  value={couponCountLabel}
                  hint={availableCouponLabel}
                  accent
                />
              </dl>
            </div>

            <div className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                  <i className="ri-coupon-3-line text-2xl" />
                </div>
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-extrabold text-primary-700">
                  쿠폰 지갑
                </span>
              </div>

              <p className="mt-6 text-sm font-bold text-foreground-600">
                보유 쿠폰
              </p>
              <div className="mt-2 flex items-end gap-2">
                <strong className="text-4xl font-black leading-none text-foreground-950">
                  {couponCountLabel}
                </strong>
                <span className="pb-1 text-sm font-extrabold text-primary-700">
                  {availableCouponLabel}
                </span>
              </div>

              <div className="mt-5 rounded-lg border border-primary-100 bg-primary-50 px-4 py-3">
                <p className="break-keep text-xs font-bold leading-5 text-primary-800">
                  쿠폰함에서 사용 가능 상태와 만료일을 바로 확인할 수 있어요.
                </p>
              </div>

              <Link
                href="#account-coupons"
                className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 text-sm font-extrabold text-primary-800 transition-colors hover:bg-primary-100"
              >
                쿠폰함 보기
                <i className="ri-arrow-right-line" />
              </Link>
            </div>
          </section>

          <section className="mt-4 grid gap-3 md:grid-cols-3">
            {orderStats.map((item) => (
              <MetricCard
                key={item.label}
                icon={item.icon}
                label={item.label}
                value={loading ? "-" : item.value}
              />
            ))}
          </section>

          <section id="account-coupons" className="mt-10 scroll-mt-28">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-px w-7 bg-primary-500" />
                  <span className="text-xs font-bold text-primary-700">
                    COUPONS
                  </span>
                </div>
                <h2 className="text-2xl font-black text-foreground-950">
                  보유 쿠폰
                </h2>
                <p className="mt-1 text-sm font-medium text-foreground-700">
                  사용 가능 {loading ? "-" : availableCouponCount}장 · 전체{" "}
                  {loading ? "-" : coupons.length}장
                </p>
              </div>
              <Link
                href="/products"
                className="inline-flex w-fit items-center gap-1 text-xs font-extrabold text-primary-700 transition-colors hover:text-primary-900"
              >
                쿠폰 쓸 상품 보기
                <i className="ri-arrow-right-line" />
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {loading &&
                Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    className="h-36 animate-pulse rounded-xl border border-background-200 bg-white"
                  />
                ))}
              {!loading &&
                coupons.map((coupon, index) => (
                  <AccountCouponCard
                    key={getCouponId(coupon) || index}
                    coupon={coupon}
                  />
                ))}
              {!loading && coupons.length === 0 && (
                <div className="rounded-xl border border-dashed border-background-300 bg-white px-6 py-12 text-center md:col-span-2 xl:col-span-3">
                  <i className="ri-coupon-3-line text-3xl text-foreground-300" />
                  <p className="mt-3 text-sm font-bold text-foreground-700">
                    보유한 쿠폰이 없습니다.
                  </p>
                  <p className="mt-1 text-xs font-medium text-foreground-600">
                    새 쿠폰이 발급되면 이곳에 표시됩니다.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section id="account-points" className="mt-10 scroll-mt-28">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-px w-7 bg-primary-500" />
                  <span className="text-xs font-bold text-primary-700">POINT HISTORY</span>
                </div>
                <h2 className="text-2xl font-black text-foreground-950">포인트 내역</h2>
                <p className="mt-1 text-sm font-medium text-foreground-700">현재 보유 포인트 {pointLabel}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-background-200 bg-white shadow-sm">
              {pointHistory.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <i className="ri-coin-line text-3xl text-foreground-300" />
                  <p className="mt-3 text-sm font-bold text-foreground-700">포인트 내역이 없습니다.</p>
                </div>
              ) : (
                <div className="divide-y divide-background-100">
                  {pointHistory.map((history, index) => {
                    const amount = Number(history.amount || 0);
                    const positive = amount >= 0;
                    return (
                      <div key={history.pointHistoryId ?? history.id ?? index} className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground-900">
                            {history.description || history.typeDescription || history.reason || pointHistoryLabel(history.type)}
                          </p>
                          <p className="mt-1 text-xs text-foreground-500">
                            {formatDate(history.createdAt || history.createdDate || undefined, true) || "-"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`text-sm font-black ${positive ? "text-primary-600" : "text-red-500"}`}>
                            {positive ? "+" : ""}{amount.toLocaleString("ko-KR")}P
                          </p>
                          {(history.balanceAfter ?? history.balance) != null && (
                            <p className="mt-1 text-xs text-foreground-500">잔액 {Number(history.balanceAfter ?? history.balance).toLocaleString("ko-KR")}P</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black text-foreground-950">
                  최근 주문
                </h2>
                <Link
                  href="/orders"
                  className="text-xs font-bold text-foreground-700 transition-colors hover:text-foreground-950"
                >
                  전체 보기
                </Link>
              </div>

              <div className="flex flex-col gap-3">
                {loading &&
                  Array.from({ length: 3 }, (_, index) => (
                    <div
                      key={index}
                      className="h-20 animate-pulse rounded-xl border border-background-200 bg-white"
                    />
                  ))}
                {!loading &&
                  orders.slice(0, 5).map((order) => (
                    <Link
                      key={order.orderId}
                      href="/orders"
                      className="flex items-center justify-between gap-4 rounded-xl border border-background-200 bg-white p-4 transition-colors hover:border-primary-200"
                    >
                      <div>
                        <p className="text-sm font-bold text-foreground-950">
                          ORD-{String(order.orderId).padStart(6, "0")}
                        </p>
                        <p className="mt-1 text-xs font-medium text-foreground-600">
                          {order.status}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-foreground-950">
                        {won(order.totalAmount)}
                      </p>
                    </Link>
                  ))}
                {!loading && orders.length === 0 && (
                  <div className="rounded-xl border border-background-200 bg-white py-16 text-center text-sm font-medium text-foreground-600">
                    아직 주문 내역이 없습니다.
                  </div>
                )}
              </div>
            </div>

            <aside className="rounded-xl border border-background-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-foreground-950">
                계정 관리
              </h2>
              <div className="mt-4 flex flex-col gap-2">
                <QuickLink
                  href="/support"
                  icon="ri-customer-service-2-line"
                  label="고객센터"
                />
                <QuickLink
                  href="/subscription"
                  icon="ri-calendar-check-line"
                  label="내 구독"
                />
                <QuickLink
                  href="/products"
                  icon="ri-store-line"
                  label="상품 둘러보기"
                />
              </div>
              <button
                type="button"
                onClick={() => setWithdrawOpen(true)}
                className="mt-6 inline-flex items-center gap-1 text-xs font-medium text-foreground-600 transition-colors hover:text-red-500"
              >
                <i className="ri-logout-box-r-line" /> 회원 탈퇴
              </button>
            </aside>
          </section>
        </div>
      </main>

      {withdrawOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground-950/55 px-4 py-6 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setWithdrawOpen(false);
              setWithdrawText("");
            }
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdraw-title"
          >
            <div className="flex items-start justify-between border-b border-background-200 px-6 py-5 md:px-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <i className="ri-user-unfollow-line text-xl" />
                </span>
                <div>
                  <p className="text-[11px] font-bold tracking-wide text-red-500">
                    ACCOUNT
                  </p>
                  <h3 id="withdraw-title" className="mt-0.5 text-lg font-bold text-foreground-950">
                    회원 탈퇴
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (deleting) return;
                  setWithdrawOpen(false);
                  setWithdrawText("");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-400 transition hover:bg-background-100 hover:text-foreground-700"
                aria-label="회원 탈퇴 모달 닫기"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            <div className="px-6 py-6 md:px-7">
              <h4 className="text-base font-bold text-foreground-950">
                정말 탈퇴하시겠어요?
              </h4>
              <p className="mt-2 text-sm leading-6 text-foreground-600">
                탈퇴하면 아래 정보가 삭제되며, 삭제 후에는 복구할 수 없습니다.
              </p>
              <div className="mt-4 rounded-xl bg-red-50/70 p-4">
                <ul className="space-y-2 text-sm text-red-800">
                  {["주문 내역", "포인트와 쿠폰", "장바구니와 구독 정보"].map(
                    (item) => (
                      <li key={item} className="flex items-center gap-2">
                        <i className="ri-checkbox-blank-circle-fill text-[6px] text-red-400" />
                        {item}
                      </li>
                    ),
                  )}
                </ul>
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800">
                <i className="ri-time-line mt-0.5 shrink-0" />
                <p>
                  탈퇴 후 <strong>30일 동안 동일 이메일로 재가입할 수 없습니다.</strong>
                </p>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="withdraw-confirmation"
                  className="mb-2 block text-sm font-semibold text-foreground-800"
                >
                  탈퇴를 진행하려면 아래 문구를 입력해주세요.
                </label>
                <p className="mb-2 rounded-lg bg-background-100 px-3 py-2 text-center text-sm font-bold text-foreground-700">
                  {WITHDRAW_TEXT}
                </p>
                <input
                  id="withdraw-confirmation"
                  type="text"
                  value={withdrawText}
                  onChange={(event) => setWithdrawText(event.target.value)}
                  placeholder="위 문구를 정확히 입력"
                  className="w-full rounded-xl border border-background-200 px-4 py-3 text-sm text-foreground-900 outline-none transition placeholder:text-foreground-400 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                />
              </div>
            </div>

            <div className="flex gap-2 border-t border-background-200 bg-background-50 px-6 py-4 md:px-7">
              <button
                type="button"
                onClick={() => {
                  setWithdrawOpen(false);
                  setWithdrawText("");
                }}
                className="flex-1 rounded-xl border border-background-200 bg-white py-3 text-sm font-semibold text-foreground-700 transition hover:bg-background-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void withdraw()}
                disabled={withdrawText.trim() !== WITHDRAW_TEXT || deleting}
                className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-200"
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

function AccountDetail({
  icon,
  label,
  value,
  hint,
  accent = false,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          accent
            ? "bg-primary-50 text-primary-700"
            : "bg-background-100 text-foreground-700"
        }`}
      >
        <i className={`${icon} text-base`} />
      </span>
      <div className="min-w-0">
        <dt className="text-sm font-bold text-foreground-600">{label}</dt>
        <dd
          className={`mt-1 break-all text-sm font-extrabold ${accent ? "text-primary-700" : "text-foreground-900"}`}
        >
          {value}
        </dd>
        {hint && (
          <p className="mt-0.5 text-xs font-bold text-foreground-600">{hint}</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-background-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-background-100 text-foreground-700">
        <i className={`${icon} text-lg`} />
      </div>
      <p className="text-sm font-bold text-foreground-600">{label}</p>
      <p className="mt-1 text-2xl font-black text-foreground-950">{value}</p>
    </div>
  );
}

function AccountActionLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-background-200 bg-white px-3 text-xs font-bold text-foreground-700 transition-colors hover:border-primary-200 hover:text-primary-700"
    >
      <i className={`${icon} text-sm`} />
      {label}
    </Link>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground-700 transition-colors hover:bg-background-100"
    >
      <i className={`${icon} text-foreground-600`} /> {label}
    </Link>
  );
}

function pointHistoryLabel(type?: string | null) {
  if (type === "EARN" || type === "ACCUMULATE") return "포인트 적립";
  if (type === "USE" || type === "SPEND") return "포인트 사용";
  if (type === "REFUND") return "포인트 환급";
  if (type === "REVOKE" || type === "REDEEM") return "포인트 회수";
  return type || "포인트 변동";
}

function AccountCouponCard({ coupon }: { coupon: Coupon }) {
  const available = coupon.status === "AVAILABLE";
  const statusClassName = available
    ? "bg-primary-50 text-primary-700"
    : coupon.status === "USED"
      ? "bg-background-100 text-foreground-600"
      : "bg-foreground-100 text-foreground-700";

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm ${available ? "border-primary-100" : "border-background-200"}`}
    >
      <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-background-200 bg-background-cream" />
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-lg font-black ${available ? "text-primary-700" : "text-foreground-700"}`}
          >
            {formatCouponBenefit(coupon)}
          </p>
          <p className="mt-1 clamp-1 text-sm font-bold text-foreground-950">
            {coupon.name || "쿠폰"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClassName}`}
        >
          {couponStatusLabel(coupon.status)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-foreground-700">
        <span>{formatCouponCondition(coupon)}</span>
        <span>{formatCouponDate(coupon.expiresAt)}까지</span>
      </div>
    </div>
  );
}
