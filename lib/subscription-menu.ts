import type { Product, SubscriptionSelection, SubscriptionSelectionItem } from "../types/api";
import { stockState } from "./products";

export type MenuSlot = Product | null;
const DAY_KEYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function productFromUnknown(value: unknown): Product | null {
    if (!isRecord(value)) return null;

    const productId = Number(value.productId ?? value.product_id ?? value.id ?? 0);
    const name = typeof value.name === "string" ? value.name : typeof value.productName === "string" ? value.productName : "";
    if (productId <= 0 || !name.trim()) return null;

    return {
        ...(value as unknown as Product),
        productId,
        name,
        basePrice: Number(value.basePrice ?? value.price ?? 0),
        stock: Number(value.stock ?? 1),
        status: String(value.status ?? "VISIBLE"),
    };
}

function productIdFromUnknown(value: unknown) {
    if (typeof value === "number") return value;
    if (!isRecord(value)) return 0;

    const product = productFromUnknown(value.product);
    if (product) return product.productId;
    return Number(value.productId ?? value.product_id ?? value.id ?? 0);
}

function quantityFromUnknown(value: unknown) {
    if (!isRecord(value)) return 1;

    const quantity = Number(value.quantity ?? value.count ?? value.qty ?? 1);
    if (!Number.isFinite(quantity) || quantity <= 0) return 1;
    return Math.max(1, Math.floor(quantity));
}

function arrayFrom(value: unknown) {
    return Array.isArray(value) ? value : [];
}

function dayIndexFromUnknown(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
        if (value >= 1 && value <= 7) return value - 1;
        if (value >= 0 && value < 7) return value;
        return -1;
    }

    if (typeof value !== "string") return -1;
    const normalized = value.trim().toUpperCase();
    const englishIndex = DAY_KEYS.findIndex((day) => normalized === day || normalized.startsWith(day));
    if (englishIndex >= 0) return englishIndex;

    return DAY_LABELS.findIndex((day) => normalized.includes(day));
}

function positionedIndexFromUnknown(value: unknown, fallbackIndex: number) {
    if (!isRecord(value)) return -1;

    const explicitIndex = dayIndexFromUnknown(value.dayOfWeek ?? value.weekday ?? value.day ?? value.deliveryDay);
    if (explicitIndex >= 0) return explicitIndex;

    const positionalIndex = dayIndexFromUnknown(value.slotIndex ?? value.index);
    if (positionalIndex >= 0) return positionalIndex;

    return fallbackIndex;
}

function isSkippedMenuItem(value: unknown) {
    if (!isRecord(value)) return false;
    const status = String(value.status || "").toUpperCase();
    return value.skipped === true || value.skip === true || status.includes("SKIP");
}

function selectionItemsFrom(value: unknown): SubscriptionSelectionItem[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => {
                const productId = productIdFromUnknown(item);
                const quantity = quantityFromUnknown(item);
                return productId > 0 ? { productId, quantity } : null;
            })
            .filter((item): item is SubscriptionSelectionItem => item !== null);
    }

    if (!isRecord(value)) return [];

    return Object.entries(value)
        .map(([productId, quantity]) => {
            const id = Number(productId);
            const count = Number(quantity);
            if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(count) || count <= 0) return null;
            return { productId: id, quantity: Math.floor(count) };
        })
        .filter((item): item is SubscriptionSelectionItem => item !== null);
}

export function completeWeeklyMenu(products: Product[], catalog: Product[], count: number): MenuSlot[] {
    const slots: MenuSlot[] = [];

    const add = (product: Product | null) => {
        if (!product || product.productId <= 0 || slots.length >= count) return;
        slots.push(product);
    };

    products.forEach(add);
    const available = catalog.filter((product) => stockState(product) !== "soldout");
    for (let index = 0; slots.length < count && available.length > 0; index += 1) {
        add(available[index % available.length]);
    }

    while (slots.length < count) slots.push(null);
    return slots.slice(0, count);
}

export function normalizeWeeklyMenu(data: unknown, catalog: Product[], count: number): MenuSlot[] {
    const catalogById = new Map(catalog.map((product) => [product.productId, product]));
    const products: Product[] = [];
    const productIds: number[] = [];
    const positionedSlots: MenuSlot[] = Array.from({ length: count }, () => null);
    let hasPositionedSlots = false;

    const collect = (item: unknown) => {
        if (isSkippedMenuItem(item)) return;

        const quantity = quantityFromUnknown(item);
        const directProduct = productFromUnknown(item);
        const nestedProduct = isRecord(item) ? productFromUnknown(item.product) : null;
        const product = directProduct ?? nestedProduct;

        if (product) {
            Array.from({ length: quantity }, () => product).forEach((candidate) => products.push(candidate));
            return;
        }

        const productId = productIdFromUnknown(item);
        if (productId > 0) {
            Array.from({ length: quantity }, () => productId).forEach((candidate) => productIds.push(candidate));
        }
    };

    const collectPositioned = (item: unknown, fallbackIndex: number) => {
        if (!isRecord(item)) return false;

        const index = positionedIndexFromUnknown(item, fallbackIndex);
        if (index < 0 || index >= count) return false;

        if (isSkippedMenuItem(item)) {
            hasPositionedSlots = true;
            positionedSlots[index] = null;
            return true;
        }

        const directProduct = productFromUnknown(item);
        const nestedProduct = productFromUnknown(item.product);
        const productId = productIdFromUnknown(item);
        const product = directProduct ?? nestedProduct ?? catalogById.get(productId) ?? null;
        if (!product) return false;

        hasPositionedSlots = true;
        positionedSlots[index] = product;
        return true;
    };

    if (Array.isArray(data)) {
        data.forEach((item, index) => {
            if (!collectPositioned(item, index)) collect(item);
        });
    } else if (isRecord(data)) {
        selectionItemsFrom(data.selection).forEach(collect);
        arrayFrom(data.weeklyMenu).forEach((item, index) => {
            if (!collectPositioned(item, index)) collect(item);
        });
        arrayFrom(data.products).forEach(collect);
        arrayFrom(data.items).forEach(collect);
        arrayFrom(data.menuItems).forEach(collect);
        arrayFrom(data.menu).forEach(collect);
        arrayFrom(data.content).forEach(collect);
        arrayFrom(data.productIds).forEach(collect);
        arrayFrom(data.menuProductIds).forEach(collect);
    }

    productIds.forEach((productId) => {
        const product = catalogById.get(productId);
        if (product) products.push(product);
    });

    if (hasPositionedSlots) return positionedSlots;

    return completeWeeklyMenu(products, catalog, count);
}

export function productIdsOf(slots: MenuSlot[]) {
    return slots.map((product) => Number(product?.productId || 0)).filter((productId) => productId > 0);
}

export function selectionFromProductIds(productIds: number[]): SubscriptionSelection {
    const quantities = new Map<number, number>();
    productIds.forEach((productId) => {
        if (productId <= 0) return;
        quantities.set(productId, (quantities.get(productId) ?? 0) + 1);
    });

    return Object.fromEntries(Array.from(quantities.entries()).map(([productId, quantity]) => [String(productId), quantity]));
}

export function selectionFromSlots(slots: MenuSlot[]) {
    return selectionFromProductIds(productIdsOf(slots));
}

export function slotsFromSelection(selection: SubscriptionSelection | SubscriptionSelectionItem[] | undefined, catalog: Product[], count: number) {
    const items = selectionItemsFrom(selection);
    if (items.length === 0) return completeWeeklyMenu([], catalog, count);

    const catalogById = new Map(catalog.map((product) => [product.productId, product]));
    const products = items.flatMap((item) => {
        const product = catalogById.get(Number(item.productId));
        if (!product) return [];
        const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
        return Array.from({ length: quantity }, () => product);
    });

    return completeWeeklyMenu(products, catalog, count);
}
