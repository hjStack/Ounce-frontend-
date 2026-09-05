"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Footer from "../../components/Footer";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/ToastContext";
import {
  MAX_MEALS,
  MIN_MEALS,
  clampMeals,
  planOf,
  storageDetail,
} from "../../lib/plan";
import {
  fetchCatalog,
  getProductPrice,
  PRODUCT_PLACEHOLDER,
  splitName,
  stockState,
  won,
} from "../../lib/products";
import {
  completeWeeklyMenu,
  normalizeWeeklyMenu,
  productIdsOf,
  selectionFromSlots,
  type MenuSlot,
} from "../../lib/subscription-menu";
import {
  canceledAtOf,
  clearLegacySubscriptionStore,
  cutoffDateOf,
  failedWeeksOf,
  hasSubscriptionFreeShippingBenefit,
  isActiveSubscription,
  isCurrentSubscription,
  maintainedWeeksOf,
  mealsPerWeekOf,
  nextDeliveryDateOf,
  nextPaymentDateOf,
  pausedUntilOf,
  paymentRetryCountOf,
  pickCurrentSubscription,
  readSubscriptionList,
  startedAtOf,
  subscriptionIdOf,
  subscriptionStatus,
  subscriptionStatusClass,
  subscriptionStatusLabel,
  withoutCanceledSchedule,
} from "../../lib/subscriptions";
import type {
  Member,
  Product,
  SubscriptionChangeMealsRequest,
  SubscriptionChangeMenuRequest,
  SubscriptionCheckoutResponse,
  SubscriptionCycle,
  SubscriptionPauseRequest,
  SubscriptionResponse,
  SubscriptionWeeklyMenuDay,
} from "../../types/api";

import { apiFetch } from "@/lib/api";

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const DAY_KEYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

type ActionKey =
  | "meals"
  | "menu"
  | "skip"
  | "pause"
  | "resume"
  | "cancelSkip"
  | "retry"
  | "checkout"
  | "cancel"
  | null;
type MenuSource = "api" | "local" | "default";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const normalized = value.includes(" ") ? value.replace(" ", "T") : value;
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(normalized)
      ? `${normalized}T00:00:00`
      : normalized,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateLabel(value?: string | null, withTime = false) {
  const date = parseDate(value);
  if (!date) return "-";

  const pad = (number: number) => String(number).padStart(2, "0");
  const base = `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
  return withTime
    ? `${base} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    : base;
}

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

function deadlineOf(subscription: SubscriptionResponse | null) {
  const explicit = parseDate(cutoffDateOf(subscription));
  if (explicit) return explicit;

  const billing = parseDate(nextPaymentDateOf(subscription));
  if (billing) {
    billing.setHours(23, 0, 0, 0);
    return billing;
  }

  return nextSundayDeadline();
}

function formatRemaining(deadline: Date) {
  const remain = deadline.getTime() - Date.now();
  if (remain <= 0) return "마감";
  const totalMinutes = Math.floor(remain / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return days > 0 ? `${days}일 ${hours}시간` : `${hours}시간 ${minutes}분`;
}

function hasMenuData(subscription: SubscriptionResponse | null) {
  if (!subscription) return false;
  return Boolean(
    subscription.weeklyMenu?.length ||
    subscription.selection?.length ||
    subscription.items?.length ||
    subscription.menu?.length ||
    subscription.menuItems?.length ||
    subscription.products?.length,
  );
}

function normalizeSkippedDays(skippedDays: boolean[], count: number) {
  return Array.from({ length: count }, (_, index) =>
    Boolean(skippedDays[index]),
  );
}

function dayIndexFromValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 1 && value <= 7) return value - 1;
    if (value >= 0 && value < 7) return value;
    return -1;
  }

  if (typeof value !== "string") return -1;
  const normalized = value.trim().toUpperCase();
  const englishIndex = DAY_KEYS.findIndex(
    (day) => normalized === day || normalized.startsWith(day),
  );
  if (englishIndex >= 0) return englishIndex;

  const koreanIndex = DAY_LABELS.findIndex((day) => normalized.includes(day));
  return koreanIndex;
}

function skippedDaysFromSubscription(
  subscription: SubscriptionResponse | null,
  count: number,
) {
  const skipped = Array.from({ length: count }, () => false);
  if (!subscription) return skipped;

  subscription.skippedDays?.forEach((day) => {
    const index = dayIndexFromValue(day);
    if (index >= 0 && index < count) skipped[index] = true;
  });

  const markSkippedItem = (item: unknown, fallbackIndex: number) => {
    if (!isRecord(item)) return;
    const status = String(item.status || "").toUpperCase();
    const skip =
      item.skipped === true || item.skip === true || status.includes("SKIP");
    if (!skip) return;

    const explicitIndex = dayIndexFromValue(
      item.dayOfWeek ?? item.weekday ?? item.day ?? item.deliveryDay,
    );
    const positionedIndex = dayIndexFromValue(item.slotIndex ?? item.index);
    const index =
      explicitIndex >= 0
        ? explicitIndex
        : positionedIndex >= 0
          ? positionedIndex
          : fallbackIndex;
    if (index >= 0 && index < count) skipped[index] = true;
  };

  [
    subscription.weeklyMenu,
    subscription.menuItems,
    subscription.items,
    subscription.menu,
  ].forEach((items) => {
    if (!Array.isArray(items)) return;
    items.forEach(markSkippedItem);
  });

  return skipped;
}

function activeMenuSlots(
  slots: MenuSlot[],
  skippedDays: boolean[],
  count: number,
) {
  const normalizedSkippedDays = normalizeSkippedDays(skippedDays, count);
  return Array.from({ length: count }, (_, index) =>
    normalizedSkippedDays[index] ? null : (slots[index] ?? null),
  );
}

function menuSignature(
  slots: MenuSlot[],
  skippedDays: boolean[],
  count: number,
) {
  const normalizedSkippedDays = normalizeSkippedDays(skippedDays, count);
  return Array.from({ length: count }, (_, index) => {
    if (normalizedSkippedDays[index]) return "skip";
    return String(slots[index]?.productId ?? "empty");
  }).join("|");
}

function weeklyMenuPayload(
  slots: MenuSlot[],
  skippedDays: boolean[],
  count: number,
): SubscriptionWeeklyMenuDay[] {
  const normalizedSkippedDays = normalizeSkippedDays(skippedDays, count);
  return Array.from({ length: count }, (_, index) => {
    if (normalizedSkippedDays[index]) {
      return { dayOfWeek: DAY_KEYS[index], skipped: true };
    }

    const productId = Number(slots[index]?.productId || 0);
    if (productId <= 0) return { dayOfWeek: DAY_KEYS[index], skipped: false };

    return {
      dayOfWeek: DAY_KEYS[index],
      productId,
      quantity: 1,
      skipped: false,
    };
  });
}

function skippedDayKeys(skippedDays: boolean[], count: number) {
  return normalizeSkippedDays(skippedDays, count)
    .map((skipped, index) => (skipped ? DAY_KEYS[index] : null))
    .filter((day): day is (typeof DAY_KEYS)[number] => day !== null);
}

function menuChangePayload(
  slots: MenuSlot[],
  skippedDays: boolean[],
  count: number,
): SubscriptionChangeMenuRequest {
  const selectedSlots = activeMenuSlots(slots, skippedDays, count);
  const skippedDaysForRequest = skippedDayKeys(skippedDays, count);
  const selection = selectionFromSlots(selectedSlots);

  if (skippedDaysForRequest.length === 0) {
    return { selection };
  }

  return {
    selection,
    productIds: productIdsOf(selectedSlots),
    weeklyMenu: weeklyMenuPayload(selectedSlots, skippedDays, count),
    skippedDays: skippedDaysForRequest,
  };
}

function normalizeCycles(data: unknown) {
  if (Array.isArray(data)) return data as SubscriptionCycle[];
  if (!isRecord(data)) return [];
  if (Array.isArray(data.content)) return data.content as SubscriptionCycle[];
  if (Array.isArray(data.items)) return data.items as SubscriptionCycle[];
  if (Array.isArray(data.cycles)) return data.cycles as SubscriptionCycle[];
  return [];
}

function cycleIdOf(cycle: SubscriptionCycle) {
  return Number(cycle.cycleId ?? cycle.subscriptionCycleId ?? cycle.id ?? 0);
}

function cycleStringField(cycle: SubscriptionCycle, keys: string[]) {
  const record = cycle as unknown as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function cyclePaymentDateOf(cycle: SubscriptionCycle) {
  return cycleStringField(cycle, [
    "billingDate",
    "billing_date",
    "billingAt",
    "billing_at",
    "paidAt",
    "paid_at",
    "paidDate",
    "paid_date",
    "paymentDate",
    "payment_date",
    "paymentAt",
    "payment_at",
    "paymentCompletedAt",
    "payment_completed_at",
    "approvedAt",
    "approved_at",
    "confirmedAt",
    "confirmed_at",
    "completedAt",
    "completed_at",
    "successAt",
    "success_at",
    "paymentTriedAt",
    "payment_tried_at",
    "createdAt",
    "createdDate",
    "created_at",
    "created_date",
  ]);
}

function cycleDeliveryDateOf(cycle: SubscriptionCycle) {
  return cycleStringField(cycle, [
    "deliveryDate",
    "delivery_date",
    "deliveredAt",
    "delivered_at",
    "nextDeliveryDate",
    "next_delivery_date",
  ]);
}

function cycleDateOf(cycle: SubscriptionCycle) {
  return cyclePaymentDateOf(cycle) || cycleDeliveryDateOf(cycle);
}

function cycleStatusLabel(cycle: SubscriptionCycle) {
  const status = String(
    cycle.status || cycle.paymentStatus || cycle.deliveryStatus || "",
  ).toUpperCase();
  if (status.includes("SUCCESS") || status === "PAID") return "결제 성공";
  if (status.includes("FAIL")) return "결제 실패";
  if (status.includes("SKIP")) return "건너뜀";
  if (status.includes("DRAFT")) return "결제 예정";
  if (status.includes("READY") || status.includes("PENDING")) return "대기";
  if (status.includes("DELIVER")) return "배송 완료";
  return status || "-";
}

function couponLabel(subscription: SubscriptionResponse) {
  if (subscription.freeShippingCouponIssued === true)
    return "3,000원 쿠폰 발급";
  const streak = maintainedWeeksOf(subscription);
  if (streak >= 4 && streak % 4 === 0) return "3,000원 쿠폰 발급 대상";
  return `다음 쿠폰까지 ${Math.max(0, 4 - (streak % 4 || 0))}회`;
}

function memberLabel(subscription: SubscriptionResponse, user: Member | null) {
  const subscriptionMember =
    subscription.memberEmail?.trim() || subscription.email?.trim();
  if (subscriptionMember) return subscriptionMember;

  const name = user?.name?.trim();
  const email = user?.email?.trim();
  if (name && email) return `${name} (${email})`;
  if (name) return name;
  if (email) return email;
  if (user?.memberId) return `회원 #${user.memberId}`;
  return "로그인 회원";
}

async function readApiMessage(response: Response, fallback: string) {
  const text = await response.text().catch(() => "");
  if (!text.trim()) return fallback;

  try {
    const data = JSON.parse(text) as { message?: unknown };
    return typeof data.message === "string" && data.message.trim()
      ? data.message
      : fallback;
  } catch {
    return text;
  }
}

function isMealCountMismatchMessage(message: string) {
  return (
    message.includes("선택한 밀키트 수량") ||
    (message.includes("수량") && message.includes("끼니"))
  );
}

function subscriptionFromCheckout(data: SubscriptionCheckoutResponse | null) {
  return data?.subscription ?? data?.detail ?? data?.data ?? null;
}

export default function SubscriptionClient() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(
    null,
  );
  const [subscriptions, setSubscriptions] = useState<SubscriptionResponse[]>(
    [],
  );
  const [cycles, setCycles] = useState<SubscriptionCycle[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [weeklyMenu, setWeeklyMenu] = useState<MenuSlot[]>([]);
  const [draftMenu, setDraftMenu] = useState<MenuSlot[]>([]);
  const [weeklySkippedDays, setWeeklySkippedDays] = useState<boolean[]>([]);
  const [draftSkippedDays, setDraftSkippedDays] = useState<boolean[]>([]);
  const [menuSource, setMenuSource] = useState<MenuSource>("default");
  const [menuPickerIndex, setMenuPickerIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draftMeals, setDraftMeals] = useState(5);
  const [pauseDate, setPauseDate] = useState(() =>
    dateInputValue(addDays(new Date(), 7)),
  );
  const [action, setAction] = useState<ActionKey>(null);
  const [countdown, setCountdown] = useState("-");
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [skipApplied, setSkipApplied] = useState(false);

  const subscriptionId = subscriptionIdOf(subscription);
  const currentMeals = mealsPerWeekOf(subscription);
  const currentPlan = planOf(currentMeals);
  const previewPlan = planOf(draftMeals);
  const status = subscriptionStatus(subscription);
  const active = Boolean(subscription) && isActiveSubscription(subscription);
  const current = Boolean(subscription) && isCurrentSubscription(subscription);
  const pausedUntil = pausedUntilOf(subscription);
  const paymentFailed = status === "PAYMENT_FAILED";
  const startedDate = startedAtOf(subscription);
  const nextPaymentDate = nextPaymentDateOf(subscription);
  const nextDeliveryDate = nextDeliveryDateOf(subscription);
  const pauseMinimumDate = dateInputValue(
    addDays(parseDate(nextPaymentDate) ?? new Date(), 1),
  );
  const deadline = useMemo(() => deadlineOf(subscription), [subscription]);
  const deadlineLabel = formatDateLabel(deadline.toISOString(), true);
  const normalizedDraftSkippedDays = normalizeSkippedDays(
    draftSkippedDays,
    currentPlan.meals,
  );
  const normalizedWeeklySkippedDays = normalizeSkippedDays(
    weeklySkippedDays,
    currentPlan.meals,
  );
  const activeDraftMenu = activeMenuSlots(
    draftMenu,
    normalizedDraftSkippedDays,
    currentPlan.meals,
  );
  const draftProductIds = productIdsOf(activeDraftMenu);
  const selectedMealCount = draftProductIds.length;
  const skippedDayCount = normalizedDraftSkippedDays.filter(Boolean).length;
  const allMenuDaysResolved = Array.from(
    { length: currentPlan.meals },
    (_, index) =>
      Boolean(activeDraftMenu[index]) || normalizedDraftSkippedDays[index],
  ).every(Boolean);
  const draftMenuAmount = activeDraftMenu.reduce(
    (sum, product) => sum + (product ? getProductPrice(product) : 0),
    0,
  );
  const menuComplete = selectedMealCount >= MIN_MEALS && allMenuDaysResolved;
  const menuChanged =
    menuComplete &&
    menuSignature(
      activeDraftMenu,
      normalizedDraftSkippedDays,
      currentPlan.meals,
    ) !==
      menuSignature(weeklyMenu, normalizedWeeklySkippedDays, currentPlan.meals);
  const mealsChanged = Boolean(subscription) && draftMeals !== currentMeals;
  const canEdit = current && status !== "CANCELED";

  useEffect(() => {
    clearLegacySubscriptionStore();
  }, []);

  useEffect(() => {
    const tick = () => setCountdown(formatRemaining(deadline));
    tick();
    const timer = window.setInterval(tick, 20_000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const mergeSubscription = useCallback(
    (nextSubscription: SubscriptionResponse) => {
      setSubscription(nextSubscription);
      setDraftMeals(mealsPerWeekOf(nextSubscription));
      setSubscriptions((items) => {
        const id = subscriptionIdOf(nextSubscription);
        if (id <= 0) return [nextSubscription, ...items];
        const exists = items.some((item) => subscriptionIdOf(item) === id);
        return exists
          ? items.map((item) =>
              subscriptionIdOf(item) === id ? nextSubscription : item,
            )
          : [nextSubscription, ...items];
      });
    },
    [],
  );

  const loadCycles = useCallback(
    async (targetSubscriptionId: number) => {
      if (targetSubscriptionId <= 0) {
        setCycles([]);
        return;
      }

      try {
        const response = await apiFetch(
          `/api/subscriptions/${targetSubscriptionId}/cycles`,
          { credentials: "include" },
        );
        if (response.status === 401 || response.status === 403) {
          toast("로그인이 필요한 페이지입니다.", "error");
          router.push("/login");
          return;
        }
        if (!response.ok) {
          setCycles([]);
          return;
        }
        setCycles(normalizeCycles(await response.json().catch(() => null)));
      } catch {
        setCycles([]);
      }
    },
    [router, toast],
  );

  const loadSubscription = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/subscriptions/me", {
        credentials: "include",
      });
      if (response.status === 401 || response.status === 403) {
        toast("로그인이 필요한 페이지입니다.", "error");
        router.push("/login");
        return;
      }
      if (!response.ok && response.status !== 404)
        throw new Error("SUBSCRIPTION_LOAD_FAILED");

      const list = response.ok ? await readSubscriptionList(response) : [];
      const nextSubscription = pickCurrentSubscription(list);
      setSubscriptions(list);
      setSubscription(nextSubscription);
      setSkipApplied(nextSubscription?.skipCancelable === true);
      setDraftMeals(mealsPerWeekOf(nextSubscription));
      await loadCycles(subscriptionIdOf(nextSubscription));
    } catch {
      setError("구독 정보를 불러오지 못했습니다.");
      toast("구독 정보를 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, loadCycles, router, toast]);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setCatalog([]);
      setCatalogLoading(false);
      return;
    }

    let ignore = false;
    setCatalogLoading(true);
    fetchCatalog(100)
      .then((products) => {
        if (!ignore) setCatalog(products);
      })
      .catch(() => {
        if (!ignore) toast("메뉴 목록을 불러오지 못했습니다.", "error");
      })
      .finally(() => {
        if (!ignore) setCatalogLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [authLoading, isAuthenticated, toast]);

  useEffect(() => {
    if (!subscription || subscriptionId <= 0 || catalogLoading) {
      if (!subscription) {
        setWeeklyMenu([]);
        setDraftMenu([]);
        setWeeklySkippedDays([]);
        setDraftSkippedDays([]);
      }
      return;
    }

    const hasApiMenu = hasMenuData(subscription);
    const slots = hasApiMenu
      ? normalizeWeeklyMenu(subscription, catalog, currentPlan.meals)
      : completeWeeklyMenu([], catalog, currentPlan.meals);
    const skippedDays = skippedDaysFromSubscription(
      subscription,
      currentPlan.meals,
    );
    const visibleSlots = activeMenuSlots(slots, skippedDays, currentPlan.meals);

    setWeeklyMenu(visibleSlots);
    setDraftMenu(visibleSlots);
    setWeeklySkippedDays(skippedDays);
    setDraftSkippedDays(skippedDays);
    setMenuSource(hasApiMenu ? "api" : "default");
  }, [
    catalog,
    catalogLoading,
    currentPlan.meals,
    nextDeliveryDate,
    nextPaymentDate,
    subscription,
    subscriptionId,
  ]);

  const handleAuthFailure = (response: Response) => {
    if (response.status !== 401 && response.status !== 403) return false;
    toast("로그인이 필요한 페이지입니다.", "error");
    router.push("/login");
    return true;
  };

  const applyDetailResponse = async (response: Response, fallback: string) => {
    if (handleAuthFailure(response)) return null;
    if (!response.ok) {
      toast(await readApiMessage(response, fallback), "error");
      return null;
    }

    const data = (await response
      .json()
      .catch(() => null)) as SubscriptionResponse | null;
    if (data) {
      mergeSubscription(data);
      void loadCycles(subscriptionIdOf(data));
    }
    return data;
  };

  const changeMeals = async () => {
    if (!subscription || subscriptionId <= 0 || !mealsChanged) return;

    setAction("meals");
    try {
      const request: SubscriptionChangeMealsRequest = {
        mealsPerWeek: previewPlan.meals,
      };
      const data = await applyDetailResponse(
        await apiFetch(`/api/subscriptions/${subscriptionId}/meals`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(request),
        }),
        "끼니 수 변경에 실패했습니다.",
      );
      if (data) toast(`주 ${previewPlan.meals}끼로 변경했습니다.`);
    } catch {
      toast("서버와 통신 중 문제가 발생했습니다.", "error");
    } finally {
      setAction(null);
    }
  };

  const selectMenuProduct = (product: Product) => {
    if (menuPickerIndex === null) return;
    setDraftMenu((items) => {
      const next = Array.from(
        { length: currentPlan.meals },
        (_, index) => items[index] ?? null,
      );
      next[menuPickerIndex] = product;
      return next;
    });
    setDraftSkippedDays((items) => {
      const next = normalizeSkippedDays(items, currentPlan.meals);
      next[menuPickerIndex] = false;
      return next;
    });
    setMenuPickerIndex(null);
  };

  const toggleSkippedDay = (index: number) => {
    if (!canEdit) return;

    const currentlySkipped = Boolean(normalizedDraftSkippedDays[index]);
    if (
      !currentlySkipped &&
      Boolean(activeDraftMenu[index]) &&
      selectedMealCount <= MIN_MEALS
    ) {
      toast(`구독은 최소 주 ${MIN_MEALS}끼부터 가능해요.`, "error");
      return;
    }

    setDraftSkippedDays((items) => {
      const next = normalizeSkippedDays(items, currentPlan.meals);
      next[index] = !currentlySkipped;
      return next;
    });

    if (!currentlySkipped) {
      setDraftMenu((items) => {
        const next = Array.from(
          { length: currentPlan.meals },
          (_, slotIndex) => items[slotIndex] ?? null,
        );
        next[index] = null;
        return next;
      });
    }
  };

  const validateMenuBeforeSubmit = () => {
    if (selectedMealCount < MIN_MEALS) {
      toast(`구독은 최소 주 ${MIN_MEALS}끼부터 가능해요.`, "error");
      return false;
    }
    if (!allMenuDaysResolved) {
      toast(
        "비어 있는 요일은 메뉴를 선택하거나 쉬어가기를 설정해주세요.",
        "error",
      );
      return false;
    }
    return true;
  };

  const saveMenu = async () => {
    if (!subscription || subscriptionId <= 0 || !canEdit) return;
    if (!validateMenuBeforeSubmit()) return;

    setAction("menu");
    try {
      const request = menuChangePayload(
        activeDraftMenu,
        normalizedDraftSkippedDays,
        currentPlan.meals,
      );
      const response = await apiFetch(
        `/api/subscriptions/${subscriptionId}/menu`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(request),
        },
      );
      if (handleAuthFailure(response)) return;
      if (!response.ok) {
        const message = await readApiMessage(
          response,
          "이번 회차 메뉴 저장에 실패했습니다.",
        );
        toast(
          skippedDayCount > 0 && isMealCountMismatchMessage(message)
            ? "쉬어가기를 포함해 이번 주 메뉴를 저장하려면 서버 검증 반영이 필요합니다."
            : message,
          "error",
        );
        return;
      }

      const data = (await response
        .json()
        .catch(() => null)) as SubscriptionResponse | null;
      if (data) {
        mergeSubscription(data);
        void loadCycles(subscriptionIdOf(data));
        setWeeklyMenu(activeDraftMenu);
        setDraftMenu(activeDraftMenu);
        setWeeklySkippedDays(normalizedDraftSkippedDays);
        setDraftSkippedDays(normalizedDraftSkippedDays);
        setMenuSource("api");
        toast("이번 주 메뉴는 고정됩니다.");
      }
    } catch {
      toast("서버와 통신 중 문제가 발생했습니다.", "error");
    } finally {
      setAction(null);
    }
  };

  const checkoutNow = async () => {
    if (!subscription || subscriptionId <= 0) return;
    if (!validateMenuBeforeSubmit()) return;

    setAction("checkout");
    try {
      const request = menuChangePayload(
        activeDraftMenu,
        normalizedDraftSkippedDays,
        currentPlan.meals,
      );
      const response = await apiFetch(
        `/api/subscriptions/${subscriptionId}/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(request),
        },
      );
      if (handleAuthFailure(response)) return;
      if (!response.ok) {
        toast(
          await readApiMessage(response, "결제 요청에 실패했습니다."),
          "error",
        );
        return;
      }

      const data = (await response
        .json()
        .catch(() => null)) as SubscriptionCheckoutResponse | null;
      const nextSubscription = subscriptionFromCheckout(data);
      if (nextSubscription) {
        mergeSubscription(nextSubscription);
        void loadCycles(subscriptionIdOf(nextSubscription));
      }
      const outcome = String(data?.outcome || "").toUpperCase();
      const failed = outcome.includes("FAIL") || outcome.includes("DECLIN");
      toast(
        data?.message ||
          (failed ? "결제에 실패했습니다." : "결제가 처리되었습니다."),
        failed ? "error" : "success",
      );
    } catch {
      toast("서버와 통신 중 문제가 발생했습니다.", "error");
    } finally {
      setAction(null);
    }
  };

  const retryPayment = async () => {
    if (!subscription || subscriptionId <= 0) return;

    setAction("retry");
    try {
      const response = await apiFetch(
        `/api/subscriptions/${subscriptionId}/payment-retry`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (handleAuthFailure(response)) return;
      if (!response.ok && response.status !== 202) {
        toast(
          await readApiMessage(response, "결제 재시도 요청에 실패했습니다."),
          "error",
        );
        return;
      }
      toast("결제 재시도를 요청했습니다. 스케줄러가 곧 처리합니다.");
      await loadSubscription();
    } catch {
      toast("서버와 통신 중 문제가 발생했습니다.", "error");
    } finally {
      setAction(null);
    }
  };

  const skipThisWeek = async () => {
    if (!subscription || subscriptionId <= 0) return;

    setAction("skip");
    try {
      const data = await applyDetailResponse(
        await apiFetch(`/api/subscriptions/${subscriptionId}/skip`, {
          method: "POST",
          credentials: "include",
        }),
        "배송 1회 건너뛰기에 실패했습니다.",
      );
      if (data) {
        setSkipApplied(true);
        const nextDate = nextPaymentDateOf(data);
        if (nextDate) {
          setPauseDate(
            dateInputValue(addDays(parseDate(nextDate) ?? new Date(), 1)),
          );
        }
        toast("다음 배송 1회를 건너뜁니다.");
      }
    } catch {
      toast("서버와 통신 중 문제가 발생했습니다.", "error");
    } finally {
      setAction(null);
    }
  };

  const cancelSkip = async () => {
    if (!subscription || subscriptionId <= 0) return;

    setAction("cancelSkip");
    try {
      const data = await applyDetailResponse(
        await apiFetch(`/api/subscriptions/${subscriptionId}/skip`, {
          method: "DELETE",
          credentials: "include",
        }),
        "배송 건너뛰기 취소에 실패했습니다.",
      );
      if (data) {
        setSkipApplied(false);
        toast("배송 건너뛰기를 취소했습니다.");
      }
    } catch {
      toast("서버와 통신 중 문제가 발생했습니다.", "error");
    } finally {
      setAction(null);
    }
  };

  const pauseUntil = async () => {
    if (!subscription || subscriptionId <= 0 || !pauseDate) return;

    setAction("pause");
    try {
      const request: SubscriptionPauseRequest = { resumeDate: pauseDate };
      const data = await applyDetailResponse(
        await apiFetch(`/api/subscriptions/${subscriptionId}/pause`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(request),
        }),
        "쉬어가기 설정에 실패했습니다.",
      );
      if (data) {
        setSkipApplied(false);
        toast(`${formatDateLabel(pauseDate)}까지 쉬어갑니다.`);
      }
    } catch {
      toast("서버와 통신 중 문제가 발생했습니다.", "error");
    } finally {
      setAction(null);
    }
  };

  const resume = async () => {
    if (!subscription || subscriptionId <= 0) return;

    setAction("resume");
    try {
      const response = await apiFetch(
        `/api/subscriptions/${subscriptionId}/resume`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (handleAuthFailure(response)) return;
      if (!response.ok) {
        toast(
          await readApiMessage(response, "쉬어가기 해제에 실패했습니다."),
          "error",
        );
        return;
      }

      const data = (await response
        .json()
        .catch(() => null)) as SubscriptionResponse | null;
      if (data) {
        setSkipApplied(false);
        mergeSubscription(data);
        void loadCycles(subscriptionIdOf(data));
      }
      toast("쉬어가기를 해제했습니다.");
    } catch {
      toast("서버와 통신 중 문제가 발생했습니다.", "error");
    } finally {
      setAction(null);
    }
  };

  const cancelSubscription = async () => {
    if (!subscription || subscriptionId <= 0) return;

    setAction("cancel");
    try {
      const response = await apiFetch(`/api/subscriptions/${subscriptionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (handleAuthFailure(response)) return;
      if (!response.ok && response.status !== 204) {
        toast(
          await readApiMessage(response, "구독 해지에 실패했습니다."),
          "error",
        );
        return;
      }

      setSubscription(null);
      setSubscriptions((items) =>
        items
          .map((item) =>
            subscriptionIdOf(item) === subscriptionId
              ? withoutCanceledSchedule({
                  ...item,
                  status: "CANCELED",
                  canceledAt: canceledAtOf(item) || new Date().toISOString(),
                })
              : item,
          )
          .filter((item) => subscriptionIdOf(item) !== subscriptionId),
      );
      setCycles([]);
      setCancelConfirmOpen(false);
      toast("구독이 해지되었습니다.");
      router.replace("/subscribe");
    } catch {
      toast("서버와 통신 중 문제가 발생했습니다.", "error");
    } finally {
      setAction(null);
    }
  };

  const sortedCycles = useMemo(
    () =>
      [...cycles].sort((a, b) => {
        const aTime = parseDate(cycleDateOf(a))?.getTime() ?? 0;
        const bTime = parseDate(cycleDateOf(b))?.getTime() ?? 0;
        return bTime - aTime;
      }),
    [cycles],
  );

  if (authLoading || loading) {
    return (
      <PageShell>
        <div className="h-40 animate-pulse rounded-xl border border-background-200 bg-white" />
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-xl border border-background-200 bg-white"
            />
          ))}
        </div>
      </PageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageShell>
        <StatePanel
          icon="ri-login-box-line"
          title="로그인이 필요합니다"
          description="내 구독 정보는 로그인한 계정 기준으로 조회됩니다."
          action={
            <Link
              href="/login"
              className="rounded-lg bg-ink-500 px-5 py-3 text-sm font-semibold text-white"
            >
              로그인하기
            </Link>
          }
        />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <StatePanel
          icon="ri-error-warning-line"
          title="구독 정보를 불러오지 못했습니다"
          description={error}
          action={
            <button
              type="button"
              onClick={() => void loadSubscription()}
              className="rounded-lg bg-ink-500 px-5 py-3 text-sm font-semibold text-white"
            >
              다시 불러오기
            </button>
          }
        />
      </PageShell>
    );
  }

  if (!subscription || !current) {
    return (
      <PageShell>
        <StatePanel
          icon="ri-calendar-check-line"
          title="현재 이용 중인 구독이 없습니다"
          description={
            subscriptions.length > 0
              ? "해지된 구독 이력만 있습니다. 새 구독을 다시 시작할 수 있습니다."
              : "주 4-7끼와 첫 메뉴를 고르면 오늘 바로 구독 결제가 진행됩니다."
          }
          action={
            <Link
              href="/subscribe"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-3 text-sm font-semibold text-white"
            >
              구독 시작하기 <i className="ri-arrow-right-line" />
            </Link>
          }
        />
        <CycleSection cycles={sortedCycles} draftAmount={draftMenuAmount} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="mb-6 rounded-xl border border-background-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px w-8 bg-primary-500" />
              <span className="text-xs font-bold text-primary-500">
                My Subscription
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground-950 md:text-3xl">
              내 구독
            </h1>
            <p className="mt-1.5 text-sm text-foreground-500">
              메뉴와 끼니 수는 다음 결제일 23시 전까지 횟수 제한 없이 바꿀 수
              있습니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${subscriptionStatusClass(status)}`}
            >
              <i
                className={
                  active ? "ri-checkbox-circle-line" : "ri-pause-circle-line"
                }
              />
              {subscriptionStatusLabel(status)}
            </span>
            {hasSubscriptionFreeShippingBenefit(subscription) && (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700">
                <i className="ri-truck-line" /> 배송비 0원
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryCard label="플랜" value={`주 ${currentPlan.meals}끼`} />
        <SummaryCard label="첫 결제일" value={formatDateLabel(startedDate)} />
        <SummaryCard
          label="다음 결제"
          value={formatDateLabel(nextPaymentDate, true)}
        />
        <SummaryCard
          label="다음 배송"
          value={formatDateLabel(nextDeliveryDate)}
        />
        <SummaryCard label="변경 마감" value={deadlineLabel} accent />
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <NoticeCard
          icon="ri-time-line"
          title="23시 배송 마감"
          text="23시 전 결제 성공은 다음날 새벽배송, 23시 이후 결제 성공은 다다음 날 새벽배송으로 접수됩니다."
        />
        <NoticeCard
          icon="ri-coupon-3-line"
          title="4회 성공 쿠폰"
          text="구독 결제가 4회 연속 성공할 때마다 3,000원 할인 쿠폰을 드립니다."
        />
      </div>

      {paymentFailed && (
        <section className="mb-6 rounded-xl border border-red-100 bg-red-50 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-red-700">
                이번 회차 결제가 실패했습니다
              </p>
              <p className="mt-1 text-sm text-red-600">
                현재 재시도 {paymentRetryCountOf(subscription)}/3회 · 실패 주차{" "}
                {failedWeeksOf(subscription)}/3주
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void retryPayment()}
                disabled={action !== null}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                {action === "retry" ? "요청 중..." : "결제 재시도"}
              </button>
              <button
                type="button"
                onClick={() => void checkoutNow()}
                disabled={action !== null || !menuComplete}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-40"
              >
                {action === "checkout" ? "결제 중..." : "선택 메뉴로 즉시 결제"}
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <WeeklyMenuSection
            active={canEdit}
            catalogLoading={catalogLoading}
            countdown={countdown}
            deadlineLabel={deadlineLabel}
            mealCount={currentPlan.meals}
            menuComplete={menuComplete}
            menuChanged={menuChanged}
            menuSource={menuSource}
            saving={action === "menu"}
            selectedMealCount={selectedMealCount}
            skippedDayCount={skippedDayCount}
            skippedDays={normalizedDraftSkippedDays}
            slots={draftMenu}
            onPickSlot={setMenuPickerIndex}
            onSave={() => void saveMenu()}
            onToggleSkippedDay={toggleSkippedDay}
          />

          <section className="mt-6 rounded-xl border border-background-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-lg font-bold text-foreground-950">구독 상세</h2>
            <p className="mt-1 text-sm text-foreground-500">
              {storageDetail(currentPlan.meals)}
            </p>

            <dl className="mt-6 grid gap-4 border-t border-background-200 pt-5 sm:grid-cols-2">
              <DetailLine
                label="구독번호"
                value={subscriptionId > 0 ? `#${subscriptionId}` : "-"}
              />
              <DetailLine
                label="회원"
                value={memberLabel(subscription, user)}
              />
              <DetailLine
                label="상태"
                value={subscriptionStatusLabel(status)}
                strong
              />
              <DetailLine
                label="구독 시작일"
                value={formatDateLabel(startedDate, true)}
              />
              <DetailLine
                label="첫 결제일"
                value={formatDateLabel(startedDate, true)}
              />
              <DetailLine
                label="다음 결제일"
                value={formatDateLabel(nextPaymentDate, true)}
              />
              <DetailLine
                label="다음 배송일"
                value={formatDateLabel(nextDeliveryDate)}
              />
              <DetailLine
                label="쉬어가기 종료"
                value={formatDateLabel(pausedUntil)}
              />
              <DetailLine
                label="연속 성공 결제"
                value={`${maintainedWeeksOf(subscription).toLocaleString("ko-KR")}회`}
              />
              <DetailLine
                label="쿠폰"
                value={couponLabel(subscription)}
                strong
              />
              <DetailLine
                label="선택 메뉴 합계"
                value={draftMenuAmount > 0 ? won(draftMenuAmount) : "-"}
              />
              <DetailLine
                label="해지일"
                value={formatDateLabel(canceledAtOf(subscription), true)}
              />
            </dl>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-background-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-foreground-950">구독 설정</h2>
          <p className="mt-1 text-sm text-foreground-500">
            배송 1회를 건너뛰거나, 다시 시작할 날짜를 정할 수 있습니다.
          </p>

          <div className="mt-5 rounded-xl bg-background-100/70 p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm text-foreground-600">주당 끼니 수</span>
              <span>
                <span className="text-2xl font-bold tracking-tight text-primary-600">
                  {previewPlan.meals}
                </span>
                <span className="text-sm font-semibold text-foreground-600">
                  끼
                </span>
              </span>
            </div>
            <input
              type="range"
              min={MIN_MEALS}
              max={MAX_MEALS}
              step={1}
              value={draftMeals}
              disabled={!canEdit}
              onChange={(event) =>
                setDraftMeals(clampMeals(event.target.value))
              }
              className="meal-range"
              aria-label="주당 끼니 수"
            />
            <div className="mt-1 grid grid-cols-4">
              {[4, 5, 6, 7].map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setDraftMeals(value)}
                  className={`text-center text-xs ${value === previewPlan.meals ? "font-bold text-primary-600" : "text-foreground-400"} disabled:opacity-40`}
                >
                  {value}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void changeMeals()}
              disabled={!canEdit || !mealsChanged || action !== null}
              className="mt-4 w-full rounded-lg bg-ink-500 px-4 py-3 text-sm font-semibold text-white hover:bg-ink-600 disabled:opacity-40"
            >
              {action === "meals" ? "변경 중..." : "끼니 수 변경"}
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => void skipThisWeek()}
              disabled={!canEdit || !active || action !== null}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-background-200 bg-white px-4 py-3 text-sm font-semibold text-foreground-800 hover:border-primary-200 hover:text-primary-700 disabled:opacity-40"
            >
              <i className="ri-skip-forward-line" />
              {action === "skip" ? "처리 중..." : "배송 1회 건너뛰기"}
            </button>
            <p className="-mt-1 px-1 text-xs leading-relaxed text-foreground-500">
              구독은 유지되며 다음 결제일에 자동으로 다시 시작됩니다.
            </p>

            {active &&
              (skipApplied || subscription?.skipCancelable === true) && (
                <button
                  type="button"
                  onClick={() => void cancelSkip()}
                  disabled={action !== null}
                  className="-mt-1 flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary-700 hover:text-primary-800 disabled:opacity-40"
                >
                  <i className="ri-play-circle-line" />
                  {action === "cancelSkip"
                    ? "해제 중..."
                    : "배송 건너뛰기 취소"}
                </button>
              )}
            <div className="rounded-xl bg-background-100/70 p-4">
              <label
                htmlFor="subscription-pause-date"
                className="text-sm font-bold text-foreground-950"
              >
                결제·배송 일시중지
              </label>
              <p className="mt-1 text-xs leading-relaxed text-foreground-500">
                선택한 날짜 전까지 결제와 배송을 멈추고, 해당 날짜부터 다시
                시작합니다.
              </p>
              <SubscriptionDatePicker
                value={pauseDate}
                min={pauseMinimumDate}
                disabled={!canEdit || !active}
                onChange={setPauseDate}
              />
              <p className="mt-2 text-[11px] text-foreground-400">
                최소 선택 가능일 · {formatDateLabel(pauseMinimumDate)}
              </p>
              <button
                type="button"
                onClick={() => void pauseUntil()}
                disabled={!canEdit || !active || !pauseDate || action !== null}
                className="mt-3 w-full rounded-lg bg-primary-500 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-40"
              >
                {action === "pause" ? "설정 중..." : "이 날짜부터 다시 시작"}
              </button>
              {!active && (status === "PAUSED" || status === "SKIPPED") && (
                <button
                  type="button"
                  onClick={() => void resume()}
                  disabled={action !== null}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary-700 hover:text-primary-800 disabled:opacity-40"
                >
                  <i className="ri-play-circle-line" />
                  {action === "resume"
                    ? "해제 중..."
                    : "일시중지 취소하고 다음 결제일부터 다시 시작"}
                </button>
              )}
            </div>
          </div>

          <hr className="my-6 border-background-200" />

          <button
            type="button"
            onClick={() => setCancelConfirmOpen(true)}
            disabled={!current || action !== null}
            className="w-full rounded-lg border border-background-200 bg-white px-6 py-3 text-sm font-semibold text-red-500 transition-colors hover:border-red-200 hover:bg-red-50 disabled:opacity-40"
          >
            {action === "cancel" ? "해지 중..." : "구독 해지"}
          </button>
        </aside>
      </div>

      <CycleSection cycles={sortedCycles} draftAmount={draftMenuAmount} />

      {menuPickerIndex !== null && (
        <MenuPickerModal
          catalog={catalog}
          currentProductId={
            normalizedDraftSkippedDays[menuPickerIndex]
              ? undefined
              : draftMenu[menuPickerIndex]?.productId
          }
          loading={catalogLoading}
          onClose={() => setMenuPickerIndex(null)}
          onSelect={selectMenuProduct}
        />
      )}

      {cancelConfirmOpen && (
        <CancelConfirmModal
          canceling={action === "cancel"}
          onClose={() => setCancelConfirmOpen(false)}
          onConfirm={() => void cancelSubscription()}
        />
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background-cream">
      <main className="min-h-screen pb-20 pt-20 md:pt-24">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8 lg:px-12">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StatePanel({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-background-200 bg-white px-6 py-16 text-center shadow-sm">
      <i className={`${icon} text-4xl text-primary-500`} />
      <h1 className="mt-4 text-2xl font-bold text-foreground-950">{title}</h1>
      <p className="mt-2 text-sm text-foreground-500">{description}</p>
      <div className="mt-6 flex justify-center">{action}</div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-background-200 bg-white p-4 shadow-sm">
      <p className="mb-1.5 text-[10px] font-semibold text-foreground-400">
        {label}
      </p>
      <p
        className={`break-keep text-base font-bold leading-tight md:text-lg ${accent ? "text-primary-600" : "text-foreground-950"}`}
      >
        {value}
      </p>
    </div>
  );
}

function dateInputToDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
}

function dateToInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function SubscriptionDatePicker({
  value,
  min,
  disabled,
  onChange,
}: {
  value: string;
  min: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const selected = dateInputToDate(value || min);
  const minimum = dateInputToDate(min);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1),
  );
  const monthLabel = `${month.getFullYear()}년 ${month.getMonth() + 1}월`;
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) =>
    index < firstDay ? null : index - firstDay + 1,
  );
  const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const previousDisabled =
    previousMonth < new Date(minimum.getFullYear(), minimum.getMonth(), 1);

  return (
    <div className="relative mt-3">
      <button
        id="subscription-pause-date"
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-between rounded-lg border border-background-200 bg-white px-3 text-left text-sm font-bold text-foreground-800 outline-none transition-colors hover:border-primary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:opacity-40"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="flex items-center gap-2">
          <i className="ri-calendar-line text-base text-primary-600" />
          {formatDateLabel(value)}
        </span>
        <i
          className={`ri-arrow-down-s-line text-base text-foreground-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-xl border border-background-200 bg-white p-3 shadow-xl"
          role="dialog"
          aria-label="일시중지 재개 날짜 선택"
        >
          <div className="flex items-center justify-between px-1 pb-3">
            <button
              type="button"
              onClick={() => setMonth(previousMonth)}
              disabled={previousDisabled}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-500 hover:bg-background-100 disabled:opacity-30"
              aria-label="이전 달"
            >
              <i className="ri-arrow-left-s-line" />
            </button>
            <strong className="text-sm text-foreground-950">
              {monthLabel}
            </strong>
            <button
              type="button"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-500 hover:bg-background-100"
              aria-label="다음 달"
            >
              <i className="ri-arrow-right-s-line" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-foreground-400">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {cells.map((day, index) => {
              if (!day) return <span key={`blank-${index}`} className="h-8" />;
              const date = new Date(month.getFullYear(), month.getMonth(), day);
              const dateValue = dateToInputValue(date);
              const unavailable = date < minimum;
              const selectedDay = dateValue === value;
              return (
                <button
                  key={dateValue}
                  type="button"
                  disabled={unavailable}
                  onClick={() => {
                    onChange(dateValue);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-lg font-medium transition-colors ${selectedDay ? "bg-primary-500 text-white" : unavailable ? "text-foreground-200" : "text-foreground-700 hover:bg-primary-50 hover:text-primary-700"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <p className="mt-3 border-t border-background-100 pt-2 text-[11px] text-foreground-400">
            {formatDateLabel(min)}부터 선택할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}

function NoticeCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex min-h-24 items-start gap-3 rounded-xl border border-primary-100 bg-primary-50 p-4">
      <i className={`${icon} mt-0.5 text-lg text-primary-600`} />
      <div>
        <p className="text-sm font-bold text-primary-900">{title}</p>
        <p className="mt-1 break-keep text-xs leading-relaxed text-primary-700/80">
          {text}
        </p>
      </div>
    </div>
  );
}

function DetailLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold text-foreground-400">{label}</dt>
      <dd
        className={`mt-1 break-keep text-sm ${strong ? "font-bold text-foreground-950" : "font-medium text-foreground-700"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function WeeklyMenuSection({
  active,
  catalogLoading,
  countdown,
  deadlineLabel,
  mealCount,
  menuComplete,
  menuChanged,
  menuSource,
  saving,
  selectedMealCount,
  skippedDayCount,
  skippedDays,
  slots,
  onPickSlot,
  onSave,
  onToggleSkippedDay,
}: {
  active: boolean;
  catalogLoading: boolean;
  countdown: string;
  deadlineLabel: string;
  mealCount: number;
  menuComplete: boolean;
  menuChanged: boolean;
  menuSource: MenuSource;
  saving: boolean;
  selectedMealCount: number;
  skippedDayCount: number;
  skippedDays: boolean[];
  slots: MenuSlot[];
  onPickSlot: (index: number) => void;
  onSave: () => void;
  onToggleSkippedDay: (index: number) => void;
}) {
  const displaySlots = Array.from(
    { length: mealCount },
    (_, index) => slots[index] ?? null,
  );
  const displaySkippedDays = normalizeSkippedDays(skippedDays, mealCount);
  const canSave =
    active && menuComplete && (menuChanged || menuSource === "default");

  return (
    <section className="rounded-xl border border-background-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-background-200 px-5 py-4 md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <i className="ri-bowl-line text-lg text-primary-500" />
            <span className="text-xs font-bold text-primary-500">
              Weekly Menu
            </span>
          </div>
          <h2 className="text-lg font-bold text-foreground-950">
            다음 회차 메뉴
          </h2>
          <p className="mt-1 text-sm text-foreground-500">
            {deadlineLabel}까지 변경 가능 · 남은 시간 {countdown}
          </p>
          <p className="mt-1 text-xs text-foreground-400">
            최소 주 {MIN_MEALS}끼는 선택해야 하고, 남는 요일은 쉬어갈 수
            있습니다.
          </p>
          <p className="mt-1 text-xs text-foreground-400">
            쉬어가기는 이번 주에만 해당돼요.
          </p>
          <p className="mt-2 text-xs font-semibold text-foreground-500">
            선택 {selectedMealCount}끼
            {skippedDayCount > 0 ? ` · 쉬어가기 ${skippedDayCount}일` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave || saving || catalogLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-600 disabled:opacity-40"
          >
            <i className="ri-save-3-line" />
            {saving ? "저장 중..." : "메뉴 저장"}
          </button>
        </div>
      </div>

      <div className="px-5 py-5 md:px-6">
        {catalogLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: mealCount }, (_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-lg bg-background-100"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {displaySlots.map((product, index) => (
              <WeeklyMenuSlot
                key={
                  product
                    ? `${product.productId}-${index}`
                    : displaySkippedDays[index]
                      ? `skip-${index}`
                      : `empty-${index}`
                }
                disabled={!active || catalogLoading}
                index={index}
                product={product}
                skipped={displaySkippedDays[index]}
                onPick={() => onPickSlot(index)}
                onToggleSkipped={() => onToggleSkippedDay(index)}
              />
            ))}
          </div>
        )}
        {!menuComplete && !catalogLoading && (
          <p className="mt-3 text-xs font-semibold text-red-500">
            {selectedMealCount < MIN_MEALS
              ? `구독은 최소 주 ${MIN_MEALS}끼부터 가능해요.`
              : "비어 있는 요일은 메뉴를 선택하거나 쉬어가기를 설정해주세요."}
          </p>
        )}
      </div>
    </section>
  );
}

function WeeklyMenuSlot({
  product,
  index,
  disabled,
  skipped,
  onPick,
  onToggleSkipped,
}: {
  product: Product | null;
  index: number;
  disabled: boolean;
  skipped: boolean;
  onPick: () => void;
  onToggleSkipped: () => void;
}) {
  const parts = splitName(product?.name);

  return (
    <article
      className={`flex min-h-36 flex-col gap-3 rounded-lg p-3 ${
        skipped
          ? "border border-yellow-100 bg-yellow-50/80"
          : "bg-background-100"
      }`}
    >
      <div className="flex min-w-0 gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white">
          {skipped ? (
            <div className="flex h-full w-full items-center justify-center text-2xl text-yellow-600">
              <i className="ri-pause-circle-line" />
            </div>
          ) : product ? (
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
            <div className="flex h-full w-full items-center justify-center text-2xl text-foreground-300">
              <i className="ri-restaurant-line" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-bold ${skipped ? "text-yellow-700" : "text-primary-600"}`}
          >
            {DAY_LABELS[index % 7]}요일
          </p>
          <h3 className="mt-1 clamp-2 text-sm font-bold leading-snug text-foreground-950">
            {skipped ? "쉬어가기" : product ? parts.title : "메뉴 선택"}
          </h3>
          <p className="mt-1 text-xs text-foreground-500">
            {skipped
              ? "이 날 상품은 없어요"
              : product
                ? parts.serving || product.unit || "1인분 밀키트"
                : "비어 있음"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onPick}
          disabled={disabled}
          className="h-9 rounded-lg border border-background-200 bg-white px-3 text-xs font-bold leading-none text-foreground-700 transition-colors hover:border-primary-200 hover:text-primary-700 disabled:opacity-40"
        >
          {skipped ? "메뉴 선택" : product ? "변경" : "선택"}
        </button>
        <button
          type="button"
          onClick={onToggleSkipped}
          disabled={disabled}
          aria-pressed={skipped}
          className={`h-9 rounded-lg px-3 text-xs font-bold leading-none transition-colors disabled:opacity-40 ${
            skipped
              ? "bg-yellow-600 text-white hover:bg-yellow-700"
              : "border border-background-200 bg-white text-foreground-600 hover:border-yellow-200 hover:text-yellow-700"
          }`}
        >
          {skipped ? (
            "쉬어가기 해제"
          ) : (
            <>
              하루
              <br />
              쉬어가기
            </>
          )}
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
          <label htmlFor="weekly-menu-search" className="sr-only">
            메뉴 검색
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-background-200 bg-background-50 px-3 py-2">
            <i className="ri-search-line text-foreground-400" />
            <input
              id="weekly-menu-search"
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

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={soldOut}
      className={`flex min-h-24 gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed ${
        current
          ? "border-primary-500 bg-primary-50"
          : soldOut
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

function CancelConfirmModal({
  canceling,
  onClose,
  onConfirm,
}: {
  canceling: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-subscription-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <i className="ri-error-warning-line text-2xl" />
        </div>
        <h2
          id="cancel-subscription-title"
          className="text-xl font-bold text-foreground-950"
        >
          정말 해지하시겠습니까?
        </h2>
        <p className="mt-2 break-keep text-sm leading-relaxed text-foreground-500">
          구독을 해지해도 이미 결제된 회차는 취소되지 않고 예정대로 배송됩니다.
          다음 회차부터 결제와 배송이 중단되며, 다시 이용하려면 새 구독을
          시작해야 합니다.
        </p>
        <div className="mt-6 grid gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={canceling}
            className="rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40"
          >
            {canceling ? "해지 중..." : "구독 해지하기"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={canceling}
            className="rounded-lg border border-background-200 bg-white px-4 py-3 text-sm font-semibold text-foreground-700 hover:bg-background-50 disabled:opacity-40"
          >
            계속 이용하기
          </button>
        </div>
      </div>
    </div>
  );
}

function CycleSection({
  cycles,
  draftAmount,
}: {
  cycles: SubscriptionCycle[];
  draftAmount: number;
}) {
  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-background-200 bg-white shadow-sm">
      <div className="border-b border-background-200 px-5 py-4">
        <h2 className="text-lg font-bold text-foreground-950">회차 이력</h2>
        <p className="mt-1 text-sm text-foreground-500">
          결제, 배송, 쉬어가기 내역을 확인합니다.
        </p>
      </div>
      {cycles.length === 0 ? (
        <div className="py-12 text-center text-sm text-foreground-400">
          표시할 회차 이력이 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-background-100 text-xs font-semibold text-foreground-500">
              <tr>
                <th className="px-5 py-3">회차</th>
                <th className="px-5 py-3">상태</th>
                <th className="px-5 py-3">결제일</th>
                <th className="px-5 py-3">배송일</th>
                <th className="px-5 py-3">재시도</th>
                <th className="px-5 py-3">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-background-200 text-foreground-700">
              {cycles.map((cycle, index) => {
                const amount =
                  cycle.status === "DRAFT" && draftAmount > 0
                    ? draftAmount
                    : Number(cycle.amount ?? cycle.totalAmount ?? 0);
                return (
                  <tr key={cycleIdOf(cycle) || index}>
                    <td className="px-5 py-3 font-bold text-foreground-950">
                      {cycleIdOf(cycle) > 0
                        ? `#${cycleIdOf(cycle)}`
                        : index + 1}
                    </td>
                    <td className="px-5 py-3">{cycleStatusLabel(cycle)}</td>
                    <td className="px-5 py-3">
                      {formatDateLabel(cyclePaymentDateOf(cycle), true)}
                    </td>
                    <td className="px-5 py-3">
                      {formatDateLabel(cycleDeliveryDateOf(cycle))}
                    </td>
                    <td className="px-5 py-3">
                      {Number(cycle.failedAttempts ?? cycle.retryCount ?? 0)}
                      /3회
                    </td>
                    <td className="px-5 py-3">
                      {amount > 0 ? won(amount) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
