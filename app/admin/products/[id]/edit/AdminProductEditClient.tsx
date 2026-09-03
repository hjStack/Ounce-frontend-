"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useAuth } from "../../../../../components/AuthContext";
import { useToast } from "../../../../../components/ToastContext";
import {
  prepareProductImage,
  readableFileSize,
} from "../../../../../lib/product-images";
import { PRODUCT_PLACEHOLDER, won } from "../../../../../lib/products";
import type { Product } from "../../../../../types/api";
import { apiFetch } from "@/lib/api";

type CategoryOption = {
  id: number;
  code: string;
  name: string;
};

type ProductWithCategoryIds = Product & {
  categoryIds?: number[];
};

const PRODUCT_STATUS_OPTIONS = [
  { value: "VISIBLE", label: "정상 판매" },
  { value: "TIME_DEAL", label: "타임딜" },
  { value: "SOLD_OUT", label: "품절" },
  { value: "PREPARING", label: "판매 준비" },
  { value: "STOPPED", label: "판매 중지" },
];

const INITIAL_FORM = {
  name: "",
  basePrice: "",
  discountPercent: "0",
  stock: "",
  status: "VISIBLE",
  categoryIds: "",
  description: "",
};

function parseCategoryIds(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );
}

export default function AdminProductEditClient({
  productId,
}: {
  productId: string;
}) {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageNotice, setImageNotice] = useState("");
  const [imageProcessing, setImageProcessing] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadProduct() {
      setLoading(true);
      try {
        const response = await apiFetch(`/api/products/${productId}`, {
          credentials: "include",
        });
        if (response.status === 404)
          throw new Error("상품을 찾을 수 없습니다.");
        if (!response.ok) throw new Error("상품 정보를 불러오지 못했습니다.");

        const data = (await response.json()) as ProductWithCategoryIds;
        if (ignore) return;

        setProduct(data);
        setForm({
          name: data.name || "",
          basePrice: String(data.basePrice || ""),
          discountPercent: String(data.discountPercent ?? 0),
          stock: String(data.stock ?? 0),
          status: data.status || "VISIBLE",
          categoryIds: Array.isArray(data.categoryIds)
            ? data.categoryIds.join(",")
            : "",
          description: data.description || "",
        });
      } catch (error) {
        if (!ignore) {
          setProduct(null);
          toast(
            error instanceof Error
              ? error.message
              : "상품 정보를 불러오지 못했습니다.",
            "error",
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadProduct();
    return () => {
      ignore = true;
    };
  }, [productId, toast]);

  useEffect(() => {
    apiFetch("/api/categories", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("CATEGORY_LOAD_FAILED");
        return res.json();
      })
      .then((data: CategoryOption[]) => setCategories(data))
      .catch(() => setCategories([]))
      .finally(() => setCategoryLoading(false));
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl("");
      return;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const selectedCategoryIds = useMemo(
    () => parseCategoryIds(form.categoryIds),
    [form.categoryIds],
  );
  const previewImageUrl =
    imagePreviewUrl || product?.imageUrl || PRODUCT_PLACEHOLDER;

  const updateField =
    (field: keyof typeof INITIAL_FORM) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const toggleCategory = (categoryId: number) => {
    const next = selectedCategoryIds.includes(categoryId)
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId];
    setForm((current) => ({ ...current, categoryIds: next.join(",") }));
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) return;

    setImageProcessing(true);
    try {
      const prepared = await prepareProductImage(file);
      setImageFile(prepared);
      setImageNotice(
        prepared.size < file.size
          ? `${readableFileSize(file.size)} 이미지를 ${readableFileSize(prepared.size)}로 줄였습니다.`
          : `${prepared.name} · ${readableFileSize(prepared.size)}`,
      );
    } catch (error) {
      setImageFile(null);
      setImageNotice("");
      toast(
        error instanceof Error
          ? error.message
          : "이미지를 처리하지 못했습니다.",
        "error",
      );
    } finally {
      setImageProcessing(false);
    }
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (imageProcessing) {
      toast("이미지를 처리하는 중입니다. 잠시 후 다시 시도해주세요.", "error");
      return;
    }

    const name = form.name.trim();
    const basePrice = Number(form.basePrice);
    const discountPercent = Number(form.discountPercent || 0);
    const stock = Number(form.stock);
    const categoryIds = parseCategoryIds(form.categoryIds);

    if (!name) {
      toast("상품명을 입력해주세요.", "error");
      return;
    }
    if (!Number.isInteger(basePrice) || basePrice <= 0) {
      toast("정상 가격을 1원 이상으로 입력해주세요.", "error");
      return;
    }
    if (
      !Number.isInteger(discountPercent) ||
      discountPercent < 0 ||
      discountPercent > 100
    ) {
      toast("할인율은 0부터 100 사이로 입력해주세요.", "error");
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      toast("재고는 0개 이상으로 입력해주세요.", "error");
      return;
    }

    const requestData = {
      name,
      basePrice,
      salePrice: 0,
      discountPercent,
      stock,
      status: form.status,
      description: form.description.trim(),
      imageUrl: product?.imageUrl || "",
      ...(categoryIds.length > 0 ? { categoryIds } : {}),
    };

    const formData = new FormData();
    formData.append(
      "request",
      new Blob([JSON.stringify(requestData)], { type: "application/json" }),
    );
    if (imageFile) formData.append("image", imageFile);

    setSaving(true);
    try {
      const response = await requestProductUpdate(productId, formData);

      if (response.ok) {
        toast("상품 정보가 수정되었습니다.");
        router.push("/admin/products");
        return;
      }

      const message = await readResponseMessage(response);
      toast(productUpdateErrorMessage(response.status, message), "error");
    } catch {
      toast("서버와 통신 중 문제가 발생했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
        상품 정보를 불러오는 중...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-red-100 bg-white p-8 text-center">
        <i className="ri-shield-keyhole-line mb-3 block text-4xl text-red-400" />
        <p className="text-sm font-semibold text-gray-800">
          관리자 권한이 필요한 화면입니다.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          ADMIN 계정으로 로그인 후 다시 열어주세요.
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
        <i className="ri-error-warning-line mb-3 block text-4xl text-gray-300" />
        <p className="text-sm font-semibold text-gray-800">
          상품을 찾을 수 없습니다.
        </p>
        <Link
          href="/admin/products"
          className="mt-4 inline-flex rounded-lg bg-primary-500 px-4 py-2 text-sm font-bold text-white"
        >
          상품 관리로 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary-600">
            Product #{product.productId}
          </p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">
            상품 정보 수정
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/products-detail/${product.productId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            <i className="ri-external-link-line" />
            상품 보기
          </Link>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            <i className="ri-arrow-left-line" />
            목록으로
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <form
          onSubmit={saveProduct}
          className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="상품명" required>
              <input
                value={form.name}
                onChange={updateField("name")}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-400"
              />
            </Field>

            <Field label="정상 가격" required>
              <input
                type="number"
                min="1"
                step="1"
                value={form.basePrice}
                onChange={updateField("basePrice")}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-400"
              />
            </Field>

            <Field label="할인율">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.discountPercent}
                onChange={updateField("discountPercent")}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-400"
              />
            </Field>

            <Field label="재고" required>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={updateField("stock")}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-400"
              />
            </Field>

            <Field label="상태">
              <select
                value={form.status}
                onChange={updateField("status")}
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-400"
              >
                {PRODUCT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="카테고리 ID">
              <input
                value={form.categoryIds}
                onChange={updateField("categoryIds")}
                placeholder="예: 1,2"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-400"
              />
            </Field>
          </div>

          <div className="mt-5">
            <Field label="카테고리">
              {categoryLoading ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-400">
                  카테고리를 불러오는 중...
                </div>
              ) : categories.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.map((category) => {
                    const selected = selectedCategoryIds.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategory(category.id)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                          selected
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-primary-200"
                        }`}
                      >
                        <span className="font-semibold">{category.name}</span>
                        <span className="text-xs opacity-70">
                          #{category.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-400">
                  카테고리를 불러오지 못했습니다.
                </div>
              )}
            </Field>
          </div>

          <div className="mt-5">
            <Field label="상품 설명">
              <textarea
                value={form.description}
                onChange={updateField("description")}
                rows={7}
                className="w-full resize-y rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm leading-6 text-gray-900 outline-none focus:border-primary-400"
              />
            </Field>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving || imageProcessing}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i
                className={
                  saving
                    ? "ri-loader-4-line text-base"
                    : "ri-save-3-line text-base"
                }
              />
              {saving
                ? "저장 중..."
                : imageProcessing
                  ? "이미지 처리 중..."
                  : "변경사항 저장"}
            </button>
            <Link
              href="/admin/products"
              className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              취소
            </Link>
          </div>
        </form>

        <aside className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900">상품 이미지</h3>
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImageUrl}
              alt={product.name}
              className="aspect-square w-full object-cover"
              onError={(event) => {
                event.currentTarget.src = PRODUCT_PLACEHOLDER;
              }}
            />
          </div>
          <label
            htmlFor="product-edit-image-upload"
            className="mt-4 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-600 transition-colors hover:border-primary-300 hover:bg-primary-50/40"
          >
            <i className="ri-image-edit-line text-lg" />
            새 이미지 선택
            <input
              id="product-edit-image-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={imageProcessing}
              onChange={(event) => void handleImageChange(event)}
            />
          </label>
          {imageFile && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-xs font-medium text-gray-500">
                {imageNotice}
              </p>
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImageNotice("");
                }}
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                제거
              </button>
            </div>
          )}

          <div className="mt-5 space-y-2 rounded-lg bg-gray-50 p-4 text-xs leading-5 text-gray-500">
            <div className="flex items-center justify-between">
              <span>현재 가격</span>
              <strong className="text-gray-800">
                {won(product.basePrice)}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span>현재 재고</span>
              <strong className="text-gray-800">
                {Number(product.stock || 0).toLocaleString("ko-KR")}개
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span>현재 상태</span>
              <strong className="text-gray-800">{product.status}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

async function requestProductUpdate(productId: string, body: FormData) {
  const endpoints = [
    `/api/admin/products/${productId}`,
    `/api/products/${productId}`,
  ];
  const methods = ["PATCH", "PUT"];
  let lastResponse: Response | null = null;

  for (const endpoint of endpoints) {
    for (const method of methods) {
      const response = await apiFetch(endpoint, {
        method,
        credentials: "include",
        body,
      });

      if (response.ok || ![404, 405, 501].includes(response.status)) {
        return response;
      }

      lastResponse = response;
    }
  }

  return lastResponse ?? new Response("", { status: 405 });
}

function productUpdateErrorMessage(status: number, message: string) {
  if ([404, 405, 501].includes(status))
    return "백엔드 상품 수정 API가 아직 연결되지 않았습니다.";
  if (status === 413)
    return "이미지 용량이 너무 큽니다. 더 작은 이미지를 선택해주세요.";
  if (status === 401 || status === 403) return "관리자 권한이 필요합니다.";
  if (
    message.includes("Maximum upload size") ||
    message.includes("FileSizeLimit")
  ) {
    return "이미지 업로드 허용 용량을 초과했습니다. 더 작은 이미지를 선택해주세요.";
  }
  if (message.includes("S3") || message.includes("이미지 업로드")) {
    return "이미지 업로드에 실패했습니다. S3 설정과 권한을 확인해주세요.";
  }
  return message || "상품 수정에 실패했습니다.";
}

async function readResponseMessage(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
