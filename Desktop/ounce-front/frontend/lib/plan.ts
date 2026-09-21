export const MIN_MEALS = 4;
export const MAX_MEALS = 7;

export interface StorageMode {
    key: "chilled" | "frozen";
    label: string;
    icon: string;
    note: string;
}

export interface Plan {
    meals: number;
    storage: StorageMode;
    confirmed: boolean;
    price?: number;
    perMeal?: number;
}

export const CHILLED: StorageMode = {
    key: "chilled",
    label: "냉장",
    icon: "ri-temp-cold-line",
    note: "수령 후 5일 내 조리",
};

export const FROZEN: StorageMode = {
    key: "frozen",
    label: "냉동",
    icon: "ri-snowy-line",
    note: "조리 전 재료를 급속 동결",
};

const PLANS: Record<number, Plan> = {
    4: { meals: 4, storage: CHILLED, confirmed: false },
    5: { meals: 5, storage: CHILLED, confirmed: true },
    6: { meals: 6, storage: FROZEN, confirmed: false },
    7: { meals: 7, storage: FROZEN, confirmed: true },
};

export function clampMeals(meals: number | string) {
    const parsed = Number.parseInt(String(meals), 10);
    if (Number.isNaN(parsed)) return 5;
    return Math.min(MAX_MEALS, Math.max(MIN_MEALS, parsed));
}

export function planOf(meals: number | string) {
    return PLANS[clampMeals(meals)];
}

export function storageDetail(meals: number | string) {
    const plan = planOf(meals);
    return plan.storage === FROZEN
        ? "완성된 음식을 얼린 게 아니라, 손질과 계량이 끝난 재료를 그대로 급속 동결했습니다. 냄비에 붓고 끓이는 시점에 조리가 완성되는 건 냉장과 같습니다."
        : "손질과 계량이 끝난 상태로 냉장 도착합니다. 받은 주 안에 다 먹는 구성이라 소비기한을 신경 쓸 일이 없습니다.";
}
