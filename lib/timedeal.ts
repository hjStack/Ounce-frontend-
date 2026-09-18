import type { Product } from "../types/api";
import { normalizeProductImage } from "./products";

export const TIME_DEAL_OPEN_HOUR = 22;
export const TIME_DEAL_CLOSE_HOUR = 23;

export type TimeDealPayload =
  | Product[]
  | {
      products?: Product[];
      items?: Product[];
      data?: Product[];
      serverTime?: string | number;
      now?: string | number;
    };

export function readTimeDealProducts(payload: TimeDealPayload) {
  const products = Array.isArray(payload)
    ? payload
    : payload.products ?? payload.items ?? payload.data ?? [];

  return products.map((product) => {
    const normalizedProduct = normalizeProductImage(product);
    const discountRate = Number(product.discountRate || 0);
    if (discountRate <= 0 || discountRate >= 100) return normalizedProduct;

    return {
      ...normalizedProduct,
      discountPercent: discountRate,
      salePrice:
        Number(normalizedProduct.salePrice || 0) > 0
          ? normalizedProduct.salePrice
          : Math.round(
              (Number(normalizedProduct.basePrice || 0) * (100 - discountRate)) /
                100,
            ),
    };
  });
}

export function readServerTimeMs(
  response: Response,
  payload?: TimeDealPayload,
) {
  const headerTime =
    response.headers.get("x-server-time") || response.headers.get("date");
  const bodyTime = payload && !Array.isArray(payload)
    ? payload.serverTime ?? payload.now
    : undefined;
  const value = headerTime ?? bodyTime;
  if (value === undefined) return undefined;

  const parsed = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function kstParts(nowMs: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(nowMs));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function kstBoundaryMs(nowMs: number, hour: number, dayOffset = 0) {
  const { year, month, day } = kstParts(nowMs);
  return Date.UTC(year, month - 1, day + dayOffset, hour - 9, 0, 0, 0);
}

export function getTimeDealState(nowMs: number) {
  const openMs = kstBoundaryMs(nowMs, TIME_DEAL_OPEN_HOUR);
  const closeMs = kstBoundaryMs(nowMs, TIME_DEAL_CLOSE_HOUR);

  if (nowMs < openMs) {
    return { phase: "before" as const, active: false, targetMs: openMs };
  }
  if (nowMs < closeMs) {
    return { phase: "active" as const, active: true, targetMs: closeMs };
  }
  return {
    phase: "after" as const,
    active: false,
    targetMs: kstBoundaryMs(nowMs, TIME_DEAL_OPEN_HOUR, 1),
  };
}

export function isAvailableTimeDeal(product: Product | undefined) {
  return Boolean(
    product && product.status !== "SOLD_OUT" && Number(product.stock || 0) > 0,
  );
}
