"use client";

import { useEffect, useMemo, useState } from "react";
import Footer from "../../components/Footer";
import { useToast } from "../../components/ToastContext";
import { CATEGORIES, fetchCatalog, inCategory, PRODUCT_PLACEHOLDER, splitName } from "../../lib/products";
import { MAX_MEALS, MIN_MEALS, clampMeals, planOf } from "../../lib/plan";
import type { Product } from "../../types/api";

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const STORAGE_KEY = "ounce.subscription.mock.v1";

interface SubscriptionStore {
    meals: number;
    planMeals: number;
    slots: Array<number | null>;
}

function seedSlots(catalog: Product[], count: number) {
    const pool = [...catalog];
    const picked: Array<number | null> = [];
    while (picked.length < count && pool.length > 0) {
        picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].productId);
    }
    while (picked.length < count) picked.push(null);
    return picked;
}

function readStore(): SubscriptionStore | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as SubscriptionStore) : null;
    } catch {
        return null;
    }
}

function saveStore(data: SubscriptionStore) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function nextSundayDeadline() {
    const now = new Date();
    const deadline = new Date(now);
    const daysUntilSunday = (7 - now.getDay()) % 7;
    deadline.setDate(now.getDate() + daysUntilSunday);
    deadline.setHours(23, 0, 0, 0);
    if (deadline.getTime() <= now.getTime()) deadline.setDate(deadline.getDate() + 7);
    return deadline;
}

export default function SubscriptionClient() {
    const { toast, confirm } = useToast();
    const [catalog, setCatalog] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [meals, setMeals] = useState(5);
    const [planMeals, setPlanMeals] = useState(5);
    const [nextPlanMeals, setNextPlanMeals] = useState(5);
    const [slots, setSlots] = useState<Array<number | null>>([]);
    const [saved, setSaved] = useState<Array<number | null>>([]);
    const [countdown, setCountdown] = useState("-");
    const [pickerIndex, setPickerIndex] = useState<number | null>(null);
    const [pickerCategory, setPickerCategory] = useState("all");
    const [pickerKeyword, setPickerKeyword] = useState("");

    useEffect(() => {
        fetchCatalog(100)
            .then((products) => setCatalog(products))
            .catch(() => toast("구독 정보를 불러오지 못했습니다.", "error"))
            .finally(() => setLoading(false));
    }, [toast]);

    useEffect(() => {
        if (loading) return;
        const stored = readStore();
        if (stored?.slots?.length) {
            const storedMeals = clampMeals(stored.meals ?? stored.slots.length);
            const nextMeals = clampMeals(stored.planMeals ?? storedMeals);
            const nextSlots = stored.slots.slice(0, storedMeals);
            while (nextSlots.length < storedMeals) nextSlots.push(null);
            setMeals(storedMeals);
            setPlanMeals(nextMeals);
            setNextPlanMeals(nextMeals);
            setSlots(nextSlots);
            setSaved(nextSlots);
            return;
        }

        const seeded = seedSlots(catalog, 5);
        setSlots(seeded);
        setSaved(seeded);
    }, [catalog, loading]);

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
            setCountdown(days > 0 ? `${days}일 ${hours}시간` : `${hours}시간 ${minutes}분`);
        };
        tick();
        const id = window.setInterval(tick, 20_000);
        return () => window.clearInterval(id);
    }, []);

    const byId = useMemo(() => new Map(catalog.map((product) => [product.productId, product])), [catalog]);
    const currentPlan = planOf(meals);
    const previewPlan = planOf(nextPlanMeals);
    const changed = slots.filter((id, index) => id !== saved[index]).length;

    const pickerProducts = useMemo(() => {
        const keyword = pickerKeyword.trim().toLowerCase();
        return catalog.filter((product) => {
            if (!inCategory(product, pickerCategory)) return false;
            if (!keyword) return true;
            return product.name.toLowerCase().includes(keyword);
        });
    }, [catalog, pickerCategory, pickerKeyword]);

    const saveWeek = () => {
        saveStore({ meals, planMeals, slots });
        setSaved(slots);
        toast("이번 주 구성을 저장했습니다.");
    };

    const resetWeek = () => {
        setSlots(saved);
    };

    const savePlan = () => {
        saveStore({ meals, planMeals: nextPlanMeals, slots });
        setPlanMeals(nextPlanMeals);
        toast(`다음 주부터 주 ${nextPlanMeals}끼로 받습니다.`);
    };

    const pauseWeek = () => {
        toast("건너뛰기는 정식 오픈 시 제공됩니다.");
    };

    const cancelSubscription = async () => {
        const ok = await confirm("구독을 해지하시겠어요?", {
            kind: "delete",
            description: "해지 기능은 정식 오픈 시 제공됩니다.",
        });
        if (ok) toast("해지는 정식 오픈 시 제공됩니다.");
    };

    return (
        <div className="bg-background-cream">
            <main className="pb-32 pt-20 md:pt-24">
                <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8 lg:px-12">
                    <div className="mb-7">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="h-px w-8 bg-accent-500" />
                            <span className="text-xs font-bold text-accent-500">My Subscription</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground-950 md:text-3xl">내 구독</h1>
                        <p className="mt-1.5 text-sm text-foreground-500">이번 주에 받을 밀키트를 직접 고르고, 마감 전까지 바꿀 수 있습니다.</p>
                    </div>

                    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                        <SummaryCard label="플랜" value={`주 ${currentPlan.meals}끼`} />
                        <SummaryCard label="보관" value={currentPlan.storage.label} icon={currentPlan.storage.icon} />
                        <SummaryCard label="도착 예정" value="화요일 새벽" />
                        <SummaryCard label="상태" value="이용 중" active />
                    </div>

                    <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3.5">
                        <i className="ri-time-line text-lg text-primary-600" />
                        <p className="text-sm text-primary-800">
                            <span className="font-semibold">이번 주 변경 마감까지 </span>
                            <span className="font-bold tabular-nums">{countdown}</span>
                        </p>
                        <p className="w-full text-xs text-primary-700/70 md:ml-auto md:w-auto">일요일 23:00 마감</p>
                    </div>

                    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-background-200 pb-4">
                        <div>
                            <h2 className="text-lg font-bold text-foreground-950">이번 주 구성</h2>
                            <p className="mt-1 text-sm text-foreground-500">카드의 교체를 눌러 다른 밀키트로 바꿀 수 있어요.</p>
                        </div>
                        <button
                            type="button"
                            onClick={resetWeek}
                            disabled={changed === 0}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground-600 transition-colors hover:text-foreground-950 disabled:hidden"
                        >
                            <i className="ri-arrow-go-back-line" /> 변경 취소
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
                        {loading &&
                            Array.from({ length: meals }, (_, index) => (
                                <div key={index} className="aspect-[4/5] animate-pulse rounded-xl bg-background-200 md:aspect-square" />
                            ))}
                        {!loading &&
                            slots.map((productId, index) => (
                                <SlotCard
                                    key={index}
                                    product={productId ? byId.get(productId) : undefined}
                                    day={DAY_LABELS[index % 7]}
                                    changed={productId !== saved[index]}
                                    onPick={() => {
                                        setPickerIndex(index);
                                        setPickerCategory("all");
                                        setPickerKeyword("");
                                    }}
                                />
                            ))}
                    </div>

                    {!loading && catalog.length === 0 && (
                        <p className="py-16 text-center text-sm text-foreground-400">구독 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
                    )}

                    <section className="mt-16">
                        <h2 className="mb-6 border-b border-background-200 pb-4 text-lg font-bold text-foreground-950">구독 설정</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-background-200 bg-white p-6">
                                <h3 className="mb-1 text-base font-semibold text-foreground-950">끼니 수 바꾸기</h3>
                                <p className="mb-5 text-xs text-foreground-400">다음 주 배송부터 적용됩니다.</p>
                                <div className="mb-2 flex items-baseline justify-between">
                                    <span className="text-sm text-foreground-600">일주일에</span>
                                    <span>
                                        <span className="text-2xl font-bold tracking-tight text-primary-600">{previewPlan.meals}</span>
                                        <span className="text-sm font-semibold text-foreground-600">끼</span>
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={MIN_MEALS}
                                    max={MAX_MEALS}
                                    step={1}
                                    value={nextPlanMeals}
                                    onChange={(event) => setNextPlanMeals(Number(event.target.value))}
                                    className="meal-range"
                                    aria-label="다음 주부터 받을 끼니 수"
                                />
                                <div className="mb-5 mt-1 grid grid-cols-4">
                                    {[4, 5, 6, 7].map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setNextPlanMeals(value)}
                                            className={`text-center text-xs ${value === previewPlan.meals ? "font-bold text-primary-600" : "text-foreground-400"}`}
                                        >
                                            {value}
                                        </button>
                                    ))}
                                </div>
                                <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-background-100/70 px-4 py-3">
                                    <i className={`${previewPlan.storage.icon} text-base text-foreground-500`} />
                                    <span className="text-sm text-foreground-700">
                                        <span className="font-semibold">{previewPlan.storage.label}</span>
                                        <span className="mx-1 text-foreground-300">·</span>
                                        <span className="text-foreground-500">{previewPlan.storage.note}</span>
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={savePlan}
                                    disabled={nextPlanMeals === planMeals}
                                    className="w-full rounded-lg bg-ink-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-600 disabled:opacity-40"
                                >
                                    다음 주부터 적용
                                </button>
                            </div>

                            <div className="flex flex-col rounded-2xl border border-background-200 bg-white p-6">
                                <h3 className="mb-1 text-base font-semibold text-foreground-950">배송 쉬어가기</h3>
                                <p className="mb-5 text-xs text-foreground-400">여행이나 출장으로 한 주를 건너뛸 때 쓰세요.</p>
                                <button
                                    type="button"
                                    onClick={pauseWeek}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-background-200 bg-white px-6 py-3 text-sm font-semibold text-foreground-700 transition-colors hover:bg-background-100"
                                >
                                    <i className="ri-pause-circle-line" /> 이번 주 건너뛰기
                                </button>
                                <hr className="my-6 border-background-200" />
                                <h3 className="mb-1 text-base font-semibold text-foreground-950">구독 해지</h3>
                                <p className="mb-5 text-xs text-foreground-400">해지하면 다음 주부터 배송이 멈춥니다. 이번 주 구성은 그대로 도착합니다.</p>
                                <button
                                    type="button"
                                    onClick={() => void cancelSubscription()}
                                    className="mt-auto w-full rounded-lg border border-background-200 bg-white px-6 py-3 text-sm font-semibold text-red-500 transition-colors hover:border-red-200 hover:bg-red-50"
                                >
                                    구독 해지
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {changed > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-background-200 bg-white/95 shadow-[0_-4px_16px_rgba(12,10,9,.06)] backdrop-blur-md">
                    <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3.5 md:px-8 lg:px-12">
                        <p className="flex-1 text-sm text-foreground-600">
                            <span className="font-semibold text-foreground-950">{changed}곳</span> 바꿨습니다.
                        </p>
                        <button
                            type="button"
                            onClick={saveWeek}
                            className="rounded-lg bg-ink-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-600"
                        >
                            저장하기
                        </button>
                    </div>
                </div>
            )}

            {pickerIndex !== null && (
                <div className="fixed inset-0 z-[100] flex items-end bg-foreground-950/45 px-0 md:items-center md:justify-center md:px-4">
                    <div className="max-h-[88vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl md:max-w-4xl md:rounded-2xl">
                        <div className="border-b border-background-200 p-4 md:p-5">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-bold text-foreground-950">밀키트 교체</h2>
                                    <p className="mt-1 text-xs text-foreground-500">{DAY_LABELS[pickerIndex % 7]}요일 슬롯</p>
                                </div>
                                <button type="button" onClick={() => setPickerIndex(null)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-background-100">
                                    <i className="ri-close-line text-xl" />
                                </button>
                            </div>
                            <input
                                type="search"
                                value={pickerKeyword}
                                onChange={(event) => setPickerKeyword(event.target.value)}
                                placeholder="밀키트 검색"
                                className="mb-3 w-full rounded-lg border border-background-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500"
                            />
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {[{ key: "all", label: "전체", icon: "ri-grid-line" }, ...CATEGORIES].map((category) => (
                                    <button
                                        key={category.key}
                                        type="button"
                                        onClick={() => setPickerCategory(category.key)}
                                        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                                            pickerCategory === category.key ? "bg-primary-500 text-white" : "bg-background-100 text-foreground-600 hover:bg-background-200"
                                        }`}
                                    >
                                        <i className={category.icon} /> {category.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="max-h-[56vh] overflow-y-auto p-4 md:p-5">
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                {pickerProducts.map((product) => (
                                    <PickerCard
                                        key={product.productId}
                                        product={product}
                                        current={slots[pickerIndex] === product.productId}
                                        used={slots.some((id, index) => id === product.productId && index !== pickerIndex)}
                                        onClick={() => {
                                            setSlots((current) => current.map((id, index) => (index === pickerIndex ? product.productId : id)));
                                            setPickerIndex(null);
                                        }}
                                    />
                                ))}
                            </div>
                            {pickerProducts.length === 0 && <p className="py-12 text-center text-sm text-foreground-400">조건에 맞는 밀키트가 없습니다.</p>}
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}

function SummaryCard({ label, value, icon, active = false }: { label: string; value: string; icon?: string; active?: boolean }) {
    return (
        <div className="rounded-xl border border-background-200 bg-white p-4">
            <p className="mb-1.5 text-[10px] text-foreground-400">{label}</p>
            <p className={`flex items-center gap-1.5 text-xl font-bold leading-none ${active ? "text-primary-600" : "text-foreground-950"}`}>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />}
                {icon && <i className={`${icon} text-lg text-primary-600`} />}
                {value}
            </p>
        </div>
    );
}

function SlotCard({ product, day, changed, onPick }: { product?: Product; day: string; changed: boolean; onPick: () => void }) {
    const parts = splitName(product?.name);
    return (
        <article className={`flex flex-col overflow-hidden rounded-xl border bg-white transition-colors ${changed ? "border-primary-300 ring-1 ring-primary-200" : "border-background-200"}`}>
            <div className="relative aspect-square overflow-hidden bg-background-100">
                {product ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={product.imageUrl || PRODUCT_PLACEHOLDER}
                            alt={parts.title}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                                event.currentTarget.src = PRODUCT_PLACEHOLDER;
                            }}
                        />
                        {changed && <span className="absolute right-2 top-2 rounded-md bg-primary-500 px-2 py-1 text-[11px] font-bold text-white shadow-sm">변경</span>}
                    </>
                ) : (
                    <div className="flex h-full items-center justify-center text-foreground-300">
                        <i className="ri-add-line text-3xl" />
                    </div>
                )}
                <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[11px] font-bold text-foreground-700 shadow-sm backdrop-blur-sm">{day}</span>
            </div>
            <div className="flex flex-1 flex-col p-3.5">
                <h3 className="clamp-2 mb-1 text-[14px] font-semibold leading-snug text-foreground-950">{product ? parts.title : "비어 있음"}</h3>
                <p className="clamp-1 mb-3 text-xs text-foreground-500">{product?.description || "밀키트를 골라주세요."}</p>
                <button
                    type="button"
                    onClick={onPick}
                    className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg border border-background-200 bg-white px-3 py-2 text-xs font-semibold text-foreground-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                >
                    <i className="ri-repeat-2-line" /> {product ? "교체" : "고르기"}
                </button>
            </div>
        </article>
    );
}

function PickerCard({ product, current, used, onClick }: { product: Product; current: boolean; used: boolean; onClick: () => void }) {
    const parts = splitName(product.name);
    return (
        <button
            type="button"
            onClick={onClick}
            className={`group relative overflow-hidden rounded-xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                current ? "border-primary-500 ring-1 ring-primary-300" : "border-background-200"
            }`}
        >
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
                {current && (
                    <span className="absolute inset-0 flex items-center justify-center bg-primary-900/45">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-primary-700">현재 선택</span>
                    </span>
                )}
                {!current && used && <span className="absolute left-2 top-2 rounded-md bg-foreground-950/70 px-2 py-1 text-[10px] font-semibold text-white">이번 주에 있음</span>}
            </div>
            <div className="p-2.5">
                <p className="clamp-2 text-[13px] font-semibold leading-snug text-foreground-950">{parts.title}</p>
            </div>
        </button>
    );
}
