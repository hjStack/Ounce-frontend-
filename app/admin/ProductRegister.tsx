"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/ToastContext";
import {
  prepareProductImage,
  readableFileSize,
} from "../../lib/product-images";
import {
  CATEGORIES,
  categoryOf,
  normalizeProductImage,
  PRODUCT_PLACEHOLDER,
  subscriptionDiscountPercentOf,
  won,
} from "../../lib/products";
import type { Product, ProductSliceResponse } from "../../types/api";
import { apiFetch } from "@/lib/api";

type CategoryOption = {
  id: number;
  code: string;
  name: string;
};

const INITIAL_FORM = {
  name: "",
  basePrice: "",
  discountPercent: "0",
  subscriptionDiscountPercent: "0",
  stock: "",
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

export default function ProductRegister() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast, confirm } = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageNotice, setImageNotice] = useState("");
  const [detailImageFile, setDetailImageFile] = useState<File | null>(null);
  const [detailImagePreviewUrl, setDetailImagePreviewUrl] = useState("");
  const [detailImageNotice, setDetailImageNotice] = useState("");
  const [imageProcessing, setImageProcessing] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const response = await apiFetch("/api/products?page=0&size=100", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("PRODUCT_LOAD_FAILED");
      const data = (await response.json()) as ProductSliceResponse;
      console.log("관리자 상품 응답:", data);
      console.log("첫 상품 imageUrl:", data.products?.[0]?.imageUrl);
      setProducts(
        (data.products ?? data.content ?? data.items ?? []).map(
          normalizeProductImage,
        ),
      );

    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, []);

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
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!imageFile) {
      setImageUrl("");
      return;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImageUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  useEffect(() => {
    if (!detailImageFile) {
      setDetailImagePreviewUrl("");
      return;
    }

    const previewUrl = URL.createObjectURL(detailImageFile);
    setDetailImagePreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [detailImageFile]);

  const selectedCategoryIds = useMemo(
    () => parseCategoryIds(form.categoryIds),
    [form.categoryIds],
  );

  const updateField =
    (field: keyof typeof INITIAL_FORM) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const toggleCategory = (categoryId: number) => {
    const next = selectedCategoryIds.includes(categoryId)
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId];
    setForm((current) => ({ ...current, categoryIds: next.join(",") }));
  };

  const reset = () => {
    setForm(INITIAL_FORM);
    setImageFile(null);
    setImageNotice("");
    setDetailImageFile(null);
    setDetailImageNotice("");
    setCreatedId(null);
  };

  const handleDetailImageChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    setImageProcessing(true);
    try {
      const prepared = await prepareProductImage(file);
      setDetailImageFile(prepared);
      setDetailImageNotice(
        prepared.size < file.size
          ? `${readableFileSize(file.size)} 이미지를 ${readableFileSize(prepared.size)}로 줄였습니다.`
          : `${prepared.name} · ${readableFileSize(prepared.size)}`,
      );
    } catch (error) {
      setDetailImageFile(null);
      setDetailImageNotice("");
      toast(
        error instanceof Error ? error.message : "이미지를 처리하지 못했습니다.",
        "error",
      );
    } finally {
      setImageProcessing(false);
    }
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      setImageFile(null);
      setImageNotice("");
      return;
    }

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

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatedId(null);

    if (imageProcessing) {
      toast("이미지를 처리하는 중입니다. 잠시 후 다시 시도해주세요.", "error");
      return;
    }

    const name = form.name.trim();
    const basePrice = Number(form.basePrice);
    const discountPercent = Number(form.discountPercent || 0);
    const subscriptionDiscountPercent = Number(
      form.subscriptionDiscountPercent || 0,
    );
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
    if (
      !Number.isInteger(subscriptionDiscountPercent) ||
      subscriptionDiscountPercent < 0 ||
      subscriptionDiscountPercent > 100
    ) {
      toast("구독 할인율은 0부터 100 사이로 입력해주세요.", "error");
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      toast("재고는 0개 이상으로 입력해주세요.", "error");
      return;
    }
    if (categoryIds.length === 0) {
      toast("카테고리를 하나 이상 선택하거나 ID를 입력해주세요.", "error");
      return;
    }

    const formData = new FormData();
    const requestData = {
      name,
      basePrice,
      salePrice: 0,
      discountPercent,
      subscriptionDiscountPercent,
      stock,
      description: form.description.trim(),
      imageUrl: "",
      categoryIds,
    };

    formData.append(
      "request",
      new Blob([JSON.stringify(requestData)], { type: "application/json" }),
    );


    if (imageFile) formData.append("image", imageFile);
    if (detailImageFile) formData.append("detailImage", detailImageFile);

    setSubmitting(true);
    try {
      const response = await apiFetch("/api/admin/products", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (response.status === 401 || response.status === 403) {
        toast("관리자 권한이 필요합니다.", "error");
        return;
      }
      if (!response.ok) {
        const message = await readResponseMessage(response);
        toast(productCreateErrorMessage(response.status, message), "error");
        return;
      }

      const productId = Number(await response.text());
      setCreatedId(Number.isFinite(productId) ? productId : null);
      toast("상품이 등록되었습니다.");
      await loadProducts();
    } catch {
      toast("서버와 통신 중 문제가 발생했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async (product: Product) => {
    const ok = await confirm("상품을 삭제하시겠습니까?", {
      kind: "delete",
      description: `${product.name} 상품이 고객 화면에서 제거됩니다.`,
    });
    if (!ok) return;

    setDeletingId(product.productId);
    try {
      const response = await apiFetch(
        `/api/admin/products/${product.productId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (response.status === 401 || response.status === 403) {
        toast("관리자 권한이 필요합니다.", "error");
        return;
      }
      if (response.status === 404) {
        toast("상품을 찾을 수 없습니다.", "error");
        await loadProducts();
        return;
      }
      if (response.status === 405) {
        toast("백엔드 상품 삭제 API가 아직 연결되지 않았습니다.", "error");
        return;
      }
      if (!response.ok) {
        toast("상품 삭제에 실패했습니다.", "error");
        return;
      }

      setProducts((current) =>
        current.filter((item) => item.productId !== product.productId),
      );
      toast("상품이 삭제되었습니다.");
    } catch {
      toast("서버와 통신 중 문제가 발생했습니다.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
        관리자 권한을 확인하는 중...
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

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:p-6"
        >
          <div className="mb-6 flex flex-col gap-3 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">새 상품 등록</h2>
              <p className="mt-1 text-sm text-gray-500">
                상품 정보와 이미지를 입력한 뒤 등록하세요.
              </p>
            </div>
            {createdId && (
              <span className="w-fit rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
                등록 완료 #{createdId}
              </span>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="상품명" required>
              <input
                value={form.name}
                onChange={updateField("name")}
                placeholder="[1인분] 우삼겹 된장찌개 밀키트"
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
                placeholder="12900"
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

            <Field label="구독 할인율">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.subscriptionDiscountPercent}
                onChange={updateField("subscriptionDiscountPercent")}
                placeholder="10"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-400"
              />
              <span className="mt-1 block text-xs text-gray-400">
                0이면 상품 화면에 구독 할인 문구를 표시하지 않습니다.
              </span>
            </Field>

            <Field label="재고" required>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={updateField("stock")}
                placeholder="100"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-400"
              />
            </Field>
          </div>

          <div className="mt-5">
            <Field label="카테고리" required>
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
                <p className="mb-2 rounded-lg border border-yellow-100 bg-yellow-50 px-3.5 py-3 text-sm text-yellow-700">
                  카테고리를 불러오지 못했습니다. ID를 직접 입력해주세요.
                </p>
              )}
              <input
                value={form.categoryIds}
                onChange={updateField("categoryIds")}
                placeholder="예: 1,2"
                className="mt-2 w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-400"
              />
            </Field>
          </div>

          <div className="mt-5">
            <Field label="상품 설명">
              <textarea
                value={form.description}
                onChange={updateField("description")}
                rows={5}
                placeholder="상품 상세 설명을 입력하세요."
                className="w-full resize-y rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm leading-6 text-gray-900 outline-none focus:border-primary-400"
              />
            </Field>
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700">상세 설명 이미지</p>
              <p className="mt-1 text-xs text-gray-400">
                상품 설명 아래에 표시할 이미지를 등록하세요.
              </p>
              <label
                htmlFor="product-detail-image-upload"
                className="mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-600 hover:border-primary-300 hover:text-primary-600"
              >
                <i className="ri-image-add-line text-base" />
                이미지 선택
                <input
                  id="product-detail-image-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={imageProcessing}
                  onChange={(event) => void handleDetailImageChange(event)}
                />
              </label>
              {detailImagePreviewUrl && (
                <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={detailImagePreviewUrl} alt="상세 설명 미리보기" className="max-h-64 w-full object-contain" />
                </div>
              )}
              {detailImageNotice && (
                <p className="mt-2 text-xs font-medium text-gray-500">{detailImageNotice}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting || imageProcessing}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className="ri-add-circle-line text-base" />
              {submitting
                ? "등록 중..."
                : imageProcessing
                  ? "이미지 처리 중..."
                  : "상품 등록"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              초기화
            </button>
          </div>
        </form>

        <aside className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900">상품 이미지</h3>
          <label
            htmlFor="product-image-upload"
            className="mt-4 flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 text-center transition-colors hover:border-primary-300 hover:bg-primary-50/40"
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="선택한 상품 이미지 미리보기"
                className="h-full w-full object-cover"
              />
            ) : (
              <>
                <i className="ri-image-add-line text-3xl text-gray-400" />
                <span className="mt-2 text-sm font-semibold text-gray-700">
                  {imageProcessing ? "이미지 처리 중..." : "이미지 선택"}
                </span>
                <span className="mt-1 text-xs text-gray-400">
                  JPG, PNG, WEBP · 최대 10MB
                </span>
              </>
            )}
            <input
              id="product-image-upload"
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
          <div className="mt-5 rounded-lg bg-gray-50 p-4 text-xs leading-5 text-gray-500">
            이미지는 업로드 전에 자동으로 압축됩니다. 이미지를 넣지 않으면 서버
            저장 URL 없이 등록됩니다.
          </div>
        </aside>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">등록된 상품</h2>
            <p className="mt-1 text-sm text-gray-500">
              현재 조회 가능한 상품을 확인하고 가격, 할인율, 재고, 상태를 관리할
              수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadProducts()}
            disabled={productsLoading}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            <i className="ri-refresh-line text-base" />
            새로고침
          </button>
        </div>

        {productsLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            상품 목록을 불러오는 중...
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            조회 가능한 상품이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                <tr>
                  <th className="px-5 py-3">상품</th>
                  <th className="px-5 py-3">카테고리</th>
                  <th className="px-5 py-3">가격</th>
                  <th className="px-5 py-3">할인율</th>
                  <th className="px-5 py-3">구독 할인</th>
                  <th className="px-5 py-3">재고</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {products.map((product) => (
                  <tr key={product.productId} className="hover:bg-gray-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            product.imageUrl || PRODUCT_PLACEHOLDER
                          }
                          alt=""
                          className="h-12 w-12 rounded-lg bg-gray-100 object-cover"
                          onLoad={(event) =>
                            console.log("이미지 성공:", event.currentTarget.src)
                          }
                          onError={(event) => {
                            console.log("이미지 실패:", event.currentTarget.src);
                            event.currentTarget.src = PRODUCT_PLACEHOLDER;
                          }}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            #{product.productId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {(() => {
                        const key = categoryOf(product);
                        const label = CATEGORIES.find(
                          (category) => category.key === key,
                        )?.label;
                        return label ? (
                          <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                            {label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">미분류</span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900">
                      {won(product.basePrice)}
                    </td>
                    <td className="px-5 py-3">
                      {Number(product.discountPercent || 0)}%
                    </td>
                    <td className="px-5 py-3 font-semibold text-primary-600">
                      {(subscriptionDiscountPercentOf(product) ?? 0) > 0
                        ? `구독 ${subscriptionDiscountPercentOf(product)}%`
                        : "-"}
                    </td>
                    <td className="px-5 py-3 tabular-nums">
                      {Number(product.stock || 0).toLocaleString("ko-KR")}개
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                        {product.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Link
                          href={`/admin/products/${product.productId}/edit`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                        >
                          <i className="ri-edit-line text-sm" />
                          수정
                        </Link>
                        <button
                          type="button"
                          onClick={() => void deleteProduct(product)}
                          disabled={deletingId === product.productId}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <i className="ri-delete-bin-line text-sm" />
                          {deletingId === product.productId
                            ? "삭제 중"
                            : "삭제"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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

function productCreateErrorMessage(status: number, message: string) {
  if (status === 413)
    return "이미지 용량이 너무 큽니다. 더 작은 이미지를 선택해주세요.";
  if (
    message.includes("Maximum upload size") ||
    message.includes("FileSizeLimit")
  ) {
    return "이미지 업로드 허용 용량을 초과했습니다. 더 작은 이미지를 선택해주세요.";
  }
  if (message.includes("S3") || message.includes("이미지 업로드")) {
    return "이미지 업로드에 실패했습니다. S3 설정과 권한을 확인해주세요.";
  }
  return message || "상품 등록에 실패했습니다.";
}

async function readResponseMessage(response: Response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
