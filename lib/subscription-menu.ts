import type { Product, SubscriptionSelection, SubscriptionSelectionItem } from "../types/api";
import { stockState } from "./products";

export type MenuSlot = Product | null;

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

    const collect = (item: unknown) => {
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

    if (Array.isArray(data)) {
        data.forEach(collect);
    } else if (isRecord(data)) {
        selectionItemsFrom(data.selection).forEach(collect);
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
