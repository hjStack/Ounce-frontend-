import type { Category, Product, ProductSliceResponse } from "../types/api";
import { apiFetch } from "@/lib/api";

export const PRODUCT_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">' +
      '<rect width="400" height="400" fill="#f7f6f4"/>' +
      '<path d="M170 210h60M175 185a8 8 0 1116 0 8 8 0 01-16 0zm34 0a8 8 0 1116 0 8 8 0 01-16 0z" stroke="#d9d6d0" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<text x="200" y="260" text-anchor="middle" fill="#a8a29e" font-family="sans-serif" font-size="15">준비 중인 이미지</text>' +
      "</svg>",
  );

const LEGACY_CDN_HOST = "e298ybk7j4ytvm.cloudfront.net";
const PRODUCT_CDN_URL = "https://cdn.ouncefresh.com";

/** Replace the retired CDN hostname still present in some product records. */
export function resolveProductImageUrl(imageUrl?: string | null) {
  const value = imageUrl?.trim();
  if (!value) return "";

  // Some API responses contain the S3 object key instead of an absolute URL.
  // Product images are served through the public CloudFront distribution.
  if (value.startsWith("img/") || value.startsWith("/img/")) {
    return `${PRODUCT_CDN_URL}/${value.replace(/^\/+/, "")}`;
  }

  try {
    const url = new URL(value);
    if (
      url.hostname.toLowerCase() === LEGACY_CDN_HOST ||
      url.pathname.startsWith("/img/") &&
        ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    ) {
      return `${PRODUCT_CDN_URL}${url.pathname}${url.search}`;
    }
  } catch {
    // Keep other non-URL values unchanged so the image error handler can report them.
  }

  return value;
}

export function normalizeProductImage<T extends { imageUrl?: string | null }>(
  product: T,
): T {
  const value = product as T & {
    thumbnailUrl?: string | null;
    image?: string | { url?: string | null } | null;
    thumbnail?: string | { url?: string | null } | null;
  };
  const imageValue =
    value.imageUrl ||
    value.thumbnailUrl ||
    (typeof value.image === "string" ? value.image : value.image?.url) ||
    (typeof value.thumbnail === "string"
      ? value.thumbnail
      : value.thumbnail?.url);

  return { ...product, imageUrl: resolveProductImageUrl(imageValue) };
}

export const CATEGORIES: Category[] = [
  {
    key: "stew",
    slug: "stew",
    label: "찌개·국물",
    icon: "ri-fire-line",
    desktop: true,
  },
  {
    key: "noodle",
    slug: "noodle",
    label: "면·파스타",
    icon: "ri-bowl-line",
    desktop: true,
  },
  {
    key: "meat",
    slug: "meat",
    label: "고기·구이",
    icon: "ri-restaurant-line",
    desktop: true,
  },
  {
    key: "nabe",
    slug: "nabe",
    label: "나베·샤브",
    icon: "ri-drop-line",
    desktop: false,
  },
  {
    key: "snack",
    slug: "snack",
    label: "분식·해물",
    icon: "ri-star-smile-line",
    desktop: false,
  },
  {
    key: "salad",
    slug: "salad",
    label: "간단 아침식사",
    icon: "ri-sun-line",
    desktop: false,
  },
];

const CATEGORY_PATTERNS: Record<string, RegExp> = {
  stew: /(찌개|국|탕|마라탕|해장|된장|김치|순두부|부대|감자탕)/,
  noodle: /(면|파스타|우동|라멘|국수|스파게티|칼국수)/,
  meat: /(고기|구이|불고기|삼겹|제육|갈비|스테이크|닭|치킨)/,
  nabe: /(나베|샤브|전골)/,
  snack: /(떡볶이|해물|새우|오징어|분식|볶음밥)/,
  salad: /(아침|브런치|샐러드|죽|수프|스프|계란|달걀|토스트|샌드위치|요거트)/,
};

export function splitName(name?: string) {
  const raw = name ?? "";
  const servingMatch = raw.match(/^\s*\[([^\]]+)\]\s*/);

  return {
    serving: servingMatch ? servingMatch[1] : "",
    title:
      raw
        .replace(/^\s*\[[^\]]+\]\s*/, "")
        .replace(/\s*밀키트\s*$/i, "")
        .trim() || raw,
  };
}

export function won(value?: number | null) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

export function getProductPrice(product: Product) {
  return product.salePrice && product.salePrice > 0
    ? product.salePrice
    : product.basePrice;
}

export function isDiscounted(product: Product) {
  return (
    Number(product.discountPercent || 0) > 0 &&
    Number(product.salePrice || 0) > 0 &&
    Number(product.salePrice || 0) < Number(product.basePrice || 0)
  );
}

export function stockState(product: Product) {
  const stock = Number(product.stock);
  if (product.status === "SOLD_OUT" || stock <= 0) return "soldout";
  if (stock <= 10) return "low";
  return "ok";
}

export function categoryOf(product: Product) {
  const explicit = (
    product.category ||
    product.categoryCode ||
    ""
  ).toLowerCase();
  if (explicit && (explicit in CATEGORY_PATTERNS || explicit === "all"))
    return explicit;

  const name = product.name || "";
  for (const category of CATEGORIES) {
    const pattern = CATEGORY_PATTERNS[category.key];
    if (pattern?.test(name)) return category.key;
  }

  return null;
}

export function inCategory(product: Product, key: string) {
  if (!key || key === "all") return true;
  return categoryOf(product) === key;
}

export async function fetchProducts(params: {
  categories?: string;
  keyword?: string;
  sort?: string;
  page?: number;
  size?: number;
}) {
  const qs = new URLSearchParams();
  if (params.categories && params.categories !== "all")
    qs.set("categories", params.categories);
  if (params.keyword) qs.set("keyword", params.keyword);
  if (params.sort) qs.set("sort", params.sort);
  qs.set("page", String(params.page ?? 0));
  qs.set("size", String(params.size ?? 10));

  const res = await apiFetch(`/api/products?${qs.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`상품 조회 실패: ${res.status}`);
  const data = (await res.json()) as ProductSliceResponse;
  return {
    ...data,
    products: data.products?.map((product) => ({
      ...product,
      ...normalizeProductImage(product),
    })),
    content: data.content?.map((product) => ({
      ...product,
      ...normalizeProductImage(product),
    })),
    items: data.items?.map((product) => ({
      ...product,
      ...normalizeProductImage(product),
    })),
  };
}

export async function fetchCatalog(size = 100) {
  const data = await fetchProducts({ size });
  return data.products ?? data.content ?? data.items ?? [];
}

export async function fetchCategoryCounts(keyword?: string) {
  const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
  const res = await apiFetch(`/api/products/category-counts${qs}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`카테고리 조회 실패: ${res.status}`);
  return (await res.json()) as Record<string, number>;
}
