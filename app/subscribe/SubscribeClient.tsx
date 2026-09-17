"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Footer from "../../components/Footer";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/ToastContext";

import { apiFetch } from "@/lib/api";
import {
  fetchCatalog,
  getProductPrice,
  PRODUCT_PLACEHOLDER,
  splitName,
  stockState,
  subscriptionDiscountPercentOf,
  won,
} from "../../lib/products";
import { MAX_MEALS, MIN_MEALS, planOf, storageDetail } from "../../lib/plan";
import {
  clearLegacySubscriptionStore,
  isCurrentSubscription,
  mealsPerWeekOf,
  pickCurrentSubscription,
  readSubscriptionList,
  subscriptionStatus,
  subscriptionStatusLabel,
} from "../../lib/subscriptions";
import { productIdsOf, selectionFromSlots } from "../../lib/subscription-menu";
import type {
  Product,
  SubscriptionCreateRequest,
  SubscriptionResponse,
} from "../../types/api";

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const PENDING_SUBSCRIPTION_KEY = "ounce.subscription.pending-checkout";
const SAVED_SUBSCRIPTION_MENU_KEY = "ounce.subscription.saved-menu";

function nextSundayDeadline() {
  const now = new Date();
  const deadline = new Date(now);
  const daysUntilSunday = (7 - now.getDay()) % 7;
  deadline.setDate(now.getDate() + daysUntilSunday);
  deadline.setHours(23, 0, 0, 0);
  if (deadline.getTime() <= now.getTime())
    deadline.setDate(deadline.getDate() + 7);
  return deadline;
}

function pickSlots(products: Product[], count: number) {
  const pool = products.filter((product) => stockState(product) !== "soldout");
  const picked: Product[] = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

export default function SubscribeClient() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [meals, setMeals] = useState(5);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [slots, setSlots] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(
    null,
  );
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState("-");
  const [menuPickerIndex, setMenuPickerIndex] = useState<number | null>(null);
  const [savedMenu, setSavedMenu] = useState<{
    mealsPerWeek: number;
    productIds: number[];
  } | null>(null);
  const [mealsHydrated, setMealsHydrated] = useState(false);
  const selected = useMemo(() => planOf(meals), [meals]);
  const selectedProductIds = productIdsOf(slots);
  const selectedSelection = selectionFromSlots(slots);
  const menuComplete = selectedProductIds.length === selected.meals;
  const selectedSubscriptionTotal = useMemo(
    () =>
      slots.reduce((total, product) => {
        if (!product) return total;
        const price = getProductPrice(product);
        const discount = subscriptionDiscountPercentOf(product) || 10;
        return total + Math.round((price * (100 - discount)) / 100);
      }, 0),
    [slots],
  );

  const resolveSubscriptionConflict = async () => {
    try {
      const response = await apiFetch("/api/subscriptions/me", {
        credentials: "include",
      });
      if (response.status === 401 || response.status === 403) {
        toast("로그인 후 구독을 신청할 수 있습니다.", "error");
        router.push("/login");
        return;
      }

      const currentSubscription = response.ok
        ? pickCurrentSubscription(await readSubscriptionList(response))
        : null;

      if (!currentSubscription) {
        toast(
          "서버에 이전 구독 상태가 아직 남아 있어 새 구독을 만들 수 없습니다. 구독 내역을 새로고침한 뒤 다시 시도해주세요.",
          "error",
        );
        return;
      }

      setSubscription(currentSubscription);
      setMeals(mealsPerWeekOf(currentSubscription));

      const status = subscriptionStatus(currentSubscription);
      toast(
        status === "PAUSED" || status === "SKIPPED"
          ? "해지된 상태가 아니라 쉬어가기 상태입니다. 내 구독에서 해지하거나 쉬어가기를 해제해주세요."
          : `${subscriptionStatusLabel(status)}인 구독이 있습니다.`,
        "error",
      );
      router.push("/subscription");
    } catch {
      toast("구독 상태 확인 중 문제가 발생했습니다.", "error");
    }
  };

  useEffect(() => {
    clearLegacySubscriptionStore();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_SUBSCRIPTION_MENU_KEY);
      if (!raw) {
        setMealsHydrated(true);
        return;
      }
      const data = JSON.parse(raw) as {
        mealsPerWeek?: number;
        productIds?: number[];
      };
      if (
        Number.isInteger(data.mealsPerWeek) &&
        Array.isArray(data.productIds) &&
        data.productIds.length === data.mealsPerWeek
      ) {
        setMeals(Math.min(MAX_MEALS, Math.max(MIN_MEALS, data.mealsPerWeek)));
        setSavedMenu({
          mealsPerWeek: data.mealsPerWeek,
          productIds: data.productIds.map(Number),
        });
      }
    } catch {
      localStorage.removeItem(SAVED_SUBSCRIPTION_MENU_KEY);
    } finally {
      setMealsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!mealsHydrated) return;
    try {
      const raw = localStorage.getItem(SAVED_SUBSCRIPTION_MENU_KEY);
      const previous = raw
        ? (JSON.parse(raw) as { productIds?: number[] })
        : null;
      const productIds =
        previous?.productIds?.length === meals
          ? previous.productIds
          : [];
      localStorage.setItem(
        SAVED_SUBSCRIPTION_MENU_KEY,
        JSON.stringify({ mealsPerWeek: meals, productIds }),
      );
    } catch {
      // 저장소 접근이 제한된 환경에서는 현재 화면 상태만 유지한다.
    }
  }, [meals, mealsHydrated]);

  useEffect(() => {
    fetchCatalog(80)
      .then((products) => setCatalog(products))
      .catch(() => toast("밀키트 목록을 불러오지 못했습니다.", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (catalog.length === 0) return;
    if (savedMenu) {
      const byId = new Map(catalog.map((product) => [product.productId, product]));
      const restored = savedMenu.productIds
        .map((productId) => byId.get(productId) || null)
        .filter((product): product is Product => product !== null);
      setSlots(
        restored.length === selected.meals
          ? restored
          : pickSlots(catalog, selected.meals),
      );
      setSavedMenu(null);
      return;
    }
    setSlots(pickSlots(catalog, selected.meals));
  }, [catalog, savedMenu, selected.meals]);

  const shuffle = () => {
    setSlots(pickSlots(catalog, selected.meals));
  };

  useEffect(() => {
    const deadline = nextSundayDeadline();
    const tick = () => {
      const remain = deadline.getTime() - Date.now();
      if (remain <= 0) {
        setCountdown("마감");
        return;
      }
      const totalMinutes = Math.floor(remain / 60_000);
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      setCountdown(
        days > 0 ? `${days}일 ${hours}시간` : `${hours}시간 ${minutes}분`,
      );
    };
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    let ignore = false;
    setSubscriptionLoading(true);

    apiFetch("/api/subscriptions/me", { credentials: "include" })
      .then(async (response) => {
        if (
          response.status === 404 ||
          response.status === 401 ||
          response.status === 403
        )
          return null;
        if (!response.ok) throw new Error("SUBSCRIPTION_FAILED");
        return pickCurrentSubscription(await readSubscriptionList(response));
      })
      .then((data) => {
        if (ignore) return;
        setSubscription(data);
        if (data && isCurrentSubscription(data)) setMeals(mealsPerWeekOf(data));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!ignore) setSubscriptionLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [authLoading, isAuthenticated]);

  const submitSubscription = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (authLoading) return;
    if (!isAuthenticated) {
      toast("로그인 후 구독을 신청할 수 있습니다.", "error");
      router.push("/login");
      return;
    }

    if (subscription && isCurrentSubscription(subscription)) {
      router.push("/subscription");
      return;
    }

    if (catalog.length > 0 && !menuComplete) {
      toast(`이번 주 메뉴 ${selected.meals}개를 모두 선택해주세요.`, "error");
      return;
    }

    setSubmitting(true);
    try {
      const request: SubscriptionCreateRequest = {
        mealsPerWeek: selected.meals,
        selection: selectedSelection,
      };
      localStorage.setItem(PENDING_SUBSCRIPTION_KEY, JSON.stringify(request));
      router.push("/checkout");
    } catch {
      toast("결제 정보를 준비하지 못했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const goToCheckout = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (authLoading) return;
    if (!isAuthenticated) {
      toast("로그인 후 결제할 수 있습니다.", "error");
      router.push("/login");
      return;
    }
    if (catalog.length > 0 && !menuComplete) {
      toast(`이번 주 메뉴 ${selected.meals}개를 모두 선택해주세요.`, "error");
      return;
    }

    const request: SubscriptionCreateRequest = {
      mealsPerWeek: selected.meals,
      selection: selectedSelection,
    };
    localStorage.setItem(PENDING_SUBSCRIPTION_KEY, JSON.stringify(request));
    router.push("/checkout");
  };

  const saveMenu = () => {
    localStorage.setItem(
      SAVED_SUBSCRIPTION_MENU_KEY,
      JSON.stringify({
        mealsPerWeek: selected.meals,
        productIds: selectedProductIds,
        selection: selectedSelection,
        savedAt: new Date().toISOString(),
      }),
    );
    toast("이번 주 메뉴를 저장했습니다.");
  };

  const selectMenuProduct = (product: Product) => {
    if (menuPickerIndex === null) return;

    setSlots((current) => {
      const next = Array.from(
        { length: selected.meals },
        (_, index) => current[index] ?? null,
      );
      next[menuPickerIndex] = product;
      return next;
    });
    setMenuPickerIndex(null);
  };

  return (
    <div className="bg-background-cream">
      <main className="pt-20 md:pt-24">
        <section className="mx-auto flex w-full max-w-7xl flex-col items-start gap-12 px-6 pb-14 pt-8 md:flex-row md:px-8 md:pb-20 md:pt-12 lg:gap-20 lg:px-12">
          <div className="flex w-full flex-col items-start text-left md:w-1/2">
            <div className="mb-6 flex items-center gap-4">
              <div className="h-px w-8 bg-primary-500" />
              <span className="text-xs font-bold text-primary-500">
                정기 구독
              </span>
            </div>

            <h1 className="mb-6 text-[2.15rem] font-bold leading-[1.24] text-foreground-950 md:text-5xl lg:text-[3.5rem]">
              <span className="block">한 주 저녁을</span>
              <span className="mt-2 block md:mt-3">미리 정해두세요</span>
            </h1>

            <p className="mb-8 text-base leading-relaxed text-foreground-600 md:text-lg">
              일주일에 몇 끼를 받을지 정하고, 그 주에 올 밀키트는 매주 직접
              고르면 됩니다.
            </p>

            <ul className="mb-10 flex flex-col gap-3.5">
              <Benefit
                icon="ri-restaurant-2-line"
                title="끓인 음식의 질"
                text="데운 국물이 아니라 냄비에 붓는 시점에 조리가 완성됩니다."
              />
              <Benefit
                icon="ri-calendar-check-line"
                title="한 주치 끼니 계획"
                text="개별 상품이 아니라 한 주의 저녁 계획을 대신 세워둡니다."
              />
              <Benefit
                icon="ri-shopping-basket-line"
                title="결정 비용 제거"
                text="장보기, 재료 남김, 소비기한 관리가 줄어듭니다."
              />
              {/* todo // 날짜 정하기 //  */}
              <Benefit
                icon="ri-truck-line"
                title="서울 새벽배송"
                text="23시 전 결제 시 다음날 새벽, 이후 결제 시 그 다음날 새벽에 도착합니다."
              />
              <Benefit
                icon="ri-gift-line"
                title="배송비 무료"
                text="구독은 끼 수와 관계없이 배송비가 없습니다."
              />
              <Benefit
                icon="ri-coupon-3-line"
                title="4주마다 할인 쿠폰"
                text="결제가 4회 이어질 때마다 3,000원 할인 쿠폰을 드립니다."
              />
            </ul>

            <p className="text-xs leading-relaxed text-foreground-400">
              신청하면 로그인한 계정의 구독 정보로 바로 반영됩니다.
            </p>
          </div>

          <div className="w-full md:sticky md:top-28 md:w-1/2">
            <div className="rounded-2xl border border-background-200 bg-white p-6 shadow-sm md:p-7">
              <div className="mb-1 flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-foreground-950">
                  일주일에 몇 끼?
                </h2>
                <p className="text-sm">
                  <span className="text-2xl font-bold tracking-tight text-primary-600">
                    {selected.meals}
                  </span>
                  <span className="text-sm font-semibold text-foreground-600">
                    끼
                  </span>
                </p>
              </div>
              <p className="mb-5 text-xs text-foreground-400">
                구독은 주 4-7끼만 선택할 수 있습니다.
              </p>

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
                <i
                  className={`${selected.storage.icon} text-lg text-primary-600`}
                />
                <span className="text-sm font-semibold text-primary-700">
                  {selected.storage.label}
                </span>
                <span className="text-foreground-300">·</span>
                <span className="text-sm text-foreground-600">
                  {selected.storage.note}
                </span>
              </div>
              <p className="mb-6 text-xs leading-relaxed text-foreground-500">
                {storageDetail(selected.meals)}
              </p>

              <div className="mb-4 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <i className="ri-bank-card-line mt-0.5 text-lg text-primary-600" />
                  <div>
                    <p className="text-sm font-bold text-foreground-950">
                      선택한 메뉴로 오늘 바로 결제됩니다
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-foreground-600">
                      23시 전 결제 시 다음날 새벽배송, 23시 이후 결제 시 그
                      다음날 새벽배송으로 접수됩니다.
                    </p>
                  </div>
                </div>
              </div>

              <form
                className="rounded-xl bg-foreground-950 p-5 text-white"
                onSubmit={submitSubscription}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/45">구독 신청</p>
                    <h3 className="mt-1 text-lg font-bold">
                      첫 주 메뉴 저장하고 시작하기
                    </h3>
                  </div>
                  <i className="ri-calendar-check-line text-2xl text-primary-300" />
                </div>
                <p className="mb-4 text-xs leading-relaxed text-white/60">
                  선택한 메뉴가 첫 번째 배송 주기에 저장되고 첫 결제가
                  진행됩니다. 이후 내 구독 화면에서 다음 결제일 23시 전까지
                  다음 회차 메뉴를 바꿀 수 있습니다. 메뉴를 바꾸지 않으면 같은
                  메뉴가 매주 자동 배송됩니다.
                </p>
                <div className="mb-4 flex items-center justify-between rounded-lg bg-white/10 px-3.5 py-3 text-xs">
                  <span className="text-white/60">
                    선택 메뉴 {selectedProductIds.length}/{selected.meals}개
                  </span>
                  <span className="font-bold text-primary-200">
                    구독가 {won(selectedSubscriptionTotal)}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    authLoading ||
                    subscriptionLoading
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                >
                  <i
                    className={
                      isAuthenticated ? "ri-check-line" : "ri-login-box-line"
                    }
                  />
                  {submitting
                    ? "신청 중..."
                    : subscriptionLoading
                      ? "구독 확인 중..."
                    : isAuthenticated
                      ? subscription && isCurrentSubscription(subscription)
                        ? "내 구독 보기"
                        : "구독 시작하기"
                      : "로그인 후 구독 보기"}
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 pb-20 md:px-8 lg:px-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-primary-500">WEEKLY MENU</p>
              <h2 className="mt-1 text-2xl font-bold text-foreground-950">
                이번 주 받을 메뉴 {selected.meals}개
              </h2>
              <p className="mt-1.5 text-sm text-foreground-500">
                첫 배송 메뉴를 직접 고르세요. 마감까지 {countdown} · 일요일 23시
                전까지 횟수 제한 없이 변경 가능
              </p>
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
                <div
                  key={index}
                  className="aspect-[4/5] animate-pulse rounded-xl bg-background-200 md:aspect-square"
                />
              ))}
            {!loading &&
              Array.from(
                { length: selected.meals },
                (_, index) => slots[index] ?? null,
              ).map((product, index) => (
                <PreviewSlot
                  key={
                    product ? `${product.productId}-${index}` : `empty-${index}`
                  }
                  product={product}
                  index={index}
                  onChange={() => setMenuPickerIndex(index)}
                />
              ))}
          </div>

          {!loading && catalog.length === 0 && (
            <div className="rounded-xl border border-background-200 bg-white py-12 text-center text-sm text-foreground-500">
              준비된 밀키트를 불러오지 못했습니다.
            </div>
          )}

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={saveMenu}
              disabled={loading || !menuComplete}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-5 py-3 text-sm font-bold text-primary-700 transition-colors hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="ri-save-3-line" />
              메뉴 저장하기
            </button>
            <form onSubmit={goToCheckout}>
              <button
                type="submit"
                disabled={
                  submitting ||
                  authLoading ||
                  subscriptionLoading ||
                  (isAuthenticated && !menuComplete)
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className="ri-bank-card-line" />
                {submitting
                  ? "결제 페이지 준비 중..."
                  : !isAuthenticated
                      ? "로그인 후 결제하기"
                      : menuComplete
                        ? "결제하기"
                        : "메뉴를 모두 선택해주세요"}
              </button>
            </form>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-lg border border-background-200 bg-white px-5 py-3 text-sm font-bold text-foreground-700 hover:border-primary-200 hover:text-primary-700"
            >
              밀키트 먼저 둘러보기 <i className="ri-arrow-right-line" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />

      {menuPickerIndex !== null && (
        <MenuPickerModal
          catalog={catalog}
          currentProductId={slots[menuPickerIndex]?.productId}
          loading={loading}
          onClose={() => setMenuPickerIndex(null)}
          onSelect={selectMenuProduct}
        />
      )}
    </div>
  );
}

function Benefit({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <i className={`${icon} mt-0.5 text-lg text-primary-500`} />
      <span className="text-sm leading-relaxed text-foreground-700">
        <b className="font-semibold text-foreground-950">{title}</b> · {text}
      </span>
    </li>
  );
}

function PreviewSlot({
  product,
  index,
  onChange,
}: {
  product: Product | null;
  index: number;
  onChange: () => void;
}) {
  const parts = splitName(product?.name);
  return (
    <article className="overflow-hidden rounded-xl border border-background-200 bg-white">
      <div className="relative aspect-square overflow-hidden bg-background-100">
        {product ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl || PRODUCT_PLACEHOLDER}
            alt={parts.title}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.src = PRODUCT_PLACEHOLDER;
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-foreground-300">
            <i className="ri-restaurant-line" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[11px] font-bold text-foreground-700 shadow-sm backdrop-blur-sm">
          {DAY_LABELS[index % 7]}
        </span>
      </div>
      <div className="p-3">
        <h3 className="min-h-9 clamp-2 text-[13px] font-semibold leading-snug text-foreground-950">
          {product ? parts.title : "메뉴 선택"}
        </h3>
        <button
          type="button"
          onClick={onChange}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-background-200 bg-white px-3 py-2 text-xs font-bold text-foreground-700 transition-colors hover:border-primary-200 hover:text-primary-700"
        >
          <i className="ri-loop-left-line" />
          {product ? "메뉴 변경" : "메뉴 선택"}
        </button>
      </div>
    </article>
  );
}

function MenuPickerModal({
  catalog,
  currentProductId,
  loading,
  onClose,
  onSelect,
}: {
  catalog: Product[];
  currentProductId?: number;
  loading: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const normalizedKeyword = keyword.trim().toLowerCase();
  const visibleProducts = useMemo(
    () =>
      catalog.filter((product) => {
        if (!normalizedKeyword) return true;
        return product.name.toLowerCase().includes(normalizedKeyword);
      }),
    [catalog, normalizedKeyword],
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-background-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground-950">메뉴 선택</h2>
            <p className="mt-1 text-xs text-foreground-500">
              같은 메뉴도 여러 끼에 중복 선택할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-foreground-500 hover:bg-background-100"
            aria-label="닫기"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="border-b border-background-200 px-5 py-3">
          <label htmlFor="subscribe-menu-search" className="sr-only">
            메뉴 검색
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-background-200 bg-background-50 px-3 py-2">
            <i className="ri-search-line text-foreground-400" />
            <input
              id="subscribe-menu-search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="메뉴명 검색"
              className="w-full bg-transparent text-sm text-foreground-800 outline-none placeholder:text-foreground-400"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-lg bg-background-100"
                />
              ))}
            </div>
          ) : visibleProducts.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleProducts.map((product) => (
                <MenuProductOption
                  key={product.productId}
                  current={product.productId === currentProductId}
                  product={product}
                  onSelect={() => onSelect(product)}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-foreground-400">
              선택할 수 있는 메뉴가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuProductOption({
  current,
  product,
  onSelect,
}: {
  current: boolean;
  product: Product;
  onSelect: () => void;
}) {
  const parts = splitName(product.name);
  const soldOut = stockState(product) === "soldout";
  const disabled = soldOut;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex min-h-24 gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed ${
        current
          ? "border-primary-500 bg-primary-50"
          : disabled
            ? "border-background-200 bg-background-100 opacity-55"
            : "border-background-200 bg-white hover:border-primary-200 hover:bg-primary-50/50"
      }`}
    >
      <span className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-background-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl || PRODUCT_PLACEHOLDER}
          alt={parts.title}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.src = PRODUCT_PLACEHOLDER;
          }}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="clamp-2 text-sm font-bold leading-snug text-foreground-950">
          {parts.title}
        </span>
        <span className="mt-1 block text-xs text-foreground-500">
          {parts.serving || product.unit || "1인분 밀키트"}
        </span>
        <span
          className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${current ? "bg-primary-500 text-white" : soldOut ? "bg-red-50 text-red-500" : "bg-primary-50 text-primary-700"}`}
        >
          {current ? "현재 선택" : soldOut ? "품절" : "선택 가능"}
        </span>
      </span>
    </button>
  );
}
