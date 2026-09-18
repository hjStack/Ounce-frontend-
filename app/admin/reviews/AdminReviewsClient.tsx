"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "../AdminShell";
import { useToast } from "../../../components/ToastContext";
import { formatDate } from "../../../lib/date";
import type { PageResponse, Review } from "../../../types/api";
import { apiFetch } from "@/lib/api";

type AdminReview = Review & {
  productName?: string;
  writerName?: string;
  hidden?: boolean;
  visible?: boolean;
  status?: string;
};

type ReviewResponse = PageResponse<AdminReview> & {
  reviews?: AdminReview[];
  data?: AdminReview[];
};

const PAGE_SIZE = 20;

function readReviews(data: ReviewResponse | AdminReview[]) {
  if (Array.isArray(data)) return data;
  return data.content ?? data.reviews ?? data.items ?? data.data ?? [];
}

function isHidden(review: AdminReview) {
  return review.hidden === true || review.visible === false || review.status === "HIDDEN";
}

export default function AdminReviewsClient() {
  const { toast, confirm } = useToast();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const loadReviews = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        size: String(PAGE_SIZE),
      });
      const response = await apiFetch(`/api/admin/reviews?${params.toString()}`, {
        credentials: "include",
      });
      if (response.status === 401 || response.status === 403) {
        setForbidden(true);
        return;
      }
      if (!response.ok) throw new Error("ADMIN_REVIEWS_FAILED");
      const data = (await response.json()) as ReviewResponse | AdminReview[];
      setReviews(readReviews(data));
      if (!Array.isArray(data)) {
        setPage(data.number ?? data.page ?? nextPage);
        setTotalPages(data.totalPages ?? 1);
      } else {
        setPage(nextPage);
        setTotalPages(1);
      }
    } catch {
      toast("리뷰 목록을 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadReviews(0);
  }, [loadReviews]);

  const visibleReviews = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return reviews;
    return reviews.filter((review) =>
      `${review.productName ?? ""} ${review.writerName ?? ""} ${review.content}`
        .toLowerCase()
        .includes(query),
    );
  }, [keyword, reviews]);

  const hideReview = async (review: AdminReview) => {
    const ok = await confirm("이 리뷰를 숨기시겠습니까?", {
      description: "숨긴 리뷰는 상품 상세 화면에 표시되지 않습니다.",
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/api/admin/reviews/${review.reviewId}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ visible: false }),
      });
      if (!response.ok) throw new Error("REVIEW_HIDE_FAILED");
      setReviews((current) =>
        current.map((item) =>
          item.reviewId === review.reviewId
            ? { ...item, hidden: true, visible: false, status: "HIDDEN" }
            : item,
        ),
      );
      toast("리뷰를 숨겼습니다.");
    } catch {
      toast("리뷰 숨김에 실패했습니다.", "error");
    }
  };

  const deleteReview = async (review: AdminReview) => {
    const ok = await confirm("이 리뷰를 영구 삭제하시겠습니까?", {
      kind: "delete",
      description: "삭제한 리뷰와 첨부 이미지는 복구할 수 없습니다.",
    });
    if (!ok) return;

    try {
      const response = await apiFetch(`/api/admin/reviews/${review.reviewId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("REVIEW_DELETE_FAILED");
      setReviews((current) => current.filter((item) => item.reviewId !== review.reviewId));
      toast("리뷰를 삭제했습니다.");
    } catch {
      toast("리뷰 삭제에 실패했습니다.", "error");
    }
  };

  return (
    <AdminShell active="/admin/reviews" title="리뷰 관리">
      {forbidden ? (
        <div className="rounded-xl border border-red-100 bg-white p-8 text-center">
          <i className="ri-shield-keyhole-line mb-3 block text-4xl text-red-400" />
          <p className="text-sm font-semibold text-gray-800">관리자 권한이 필요한 화면입니다.</p>
        </div>
      ) : (
        <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">상품 리뷰</h2>
              <p className="mt-1 text-xs text-gray-500">부적절한 리뷰를 숨기거나 삭제할 수 있습니다.</p>
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <i className="ri-search-line text-gray-400" />
              <input
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="상품명, 작성자, 내용 검색"
                className="min-w-0 bg-transparent text-sm outline-none"
              />
            </label>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">리뷰 목록을 불러오는 중...</div>
          ) : visibleReviews.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">조건에 맞는 리뷰가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                  <tr>
                    <th className="px-5 py-3">상품</th>
                    <th className="px-5 py-3">작성자</th>
                    <th className="px-5 py-3">리뷰 내용</th>
                    <th className="px-5 py-3">작성일</th>
                    <th className="px-5 py-3">상태</th>
                    <th className="px-5 py-3 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleReviews.map((review) => {
                    const hidden = isHidden(review);
                    return (
                      <tr key={review.reviewId} className={hidden ? "bg-gray-50 text-gray-400" : "text-gray-700"}>
                        <td className="px-5 py-4 font-semibold text-gray-900">{review.productName || `상품 #${review.productId}`}</td>
                        <td className="px-5 py-4 text-xs">{review.writerName || `회원 #${review.memberId ?? "-"}`}</td>
                        <td className="max-w-[360px] truncate px-5 py-4">{review.content}</td>
                        <td className="px-5 py-4 text-xs text-gray-500">{formatDate(review.createdAt, true) || "-"}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${hidden ? "bg-gray-200 text-gray-500" : "bg-green-50 text-green-700"}`}>
                            {hidden ? "숨김" : "노출"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {!hidden && (
                              <button type="button" onClick={() => void hideReview(review)} className="rounded-lg border border-amber-100 px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50">숨김</button>
                            )}
                            <button type="button" onClick={() => void deleteReview(review)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">삭제</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <button type="button" onClick={() => void loadReviews(Math.max(0, page - 1))} disabled={page <= 0 || loading} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-40">이전</button>
            <span className="text-xs text-gray-400">{page + 1} / {Math.max(1, totalPages)}</span>
            <button type="button" onClick={() => void loadReviews(page + 1)} disabled={page + 1 >= totalPages || loading} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-40">다음</button>
          </div>
        </section>
      )}
    </AdminShell>
  );
}
