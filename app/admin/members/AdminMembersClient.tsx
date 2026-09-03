"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "../AdminShell";
import { useToast } from "../../../components/ToastContext";
import { formatDate } from "../../../lib/date";
import { won } from "../../../lib/products";
import type { AdminMember, PageResponse, RoleClaim } from "../../../types/api";
import { apiFetch } from "@/lib/api";

const PAGE_SIZE = 20;

const FILTERS = [
  { key: "ALL", label: "전체" },
  { key: "ADMIN", label: "관리자" },
  { key: "MEMBER", label: "일반 회원" },
  { key: "INACTIVE", label: "비활성" },
];

type MemberListResponse = PageResponse<AdminMember> & {
  members?: AdminMember[];
  data?: AdminMember[];
  results?: AdminMember[];
  totalCount?: number;
  total?: number;
};

function readMembers(data: MemberListResponse | AdminMember[]) {
  if (Array.isArray(data)) return data;
  return (
    data.content ??
    data.members ??
    data.items ??
    data.data ??
    data.results ??
    []
  );
}

function readTotal(data: MemberListResponse | AdminMember[], count: number) {
  if (Array.isArray(data)) return count;
  return data.totalElements ?? data.totalCount ?? data.total ?? count;
}

function readPage(data: MemberListResponse | AdminMember[], fallback: number) {
  if (Array.isArray(data)) return fallback;
  return data.number ?? data.page ?? fallback;
}

function readTotalPages(data: MemberListResponse | AdminMember[]) {
  if (Array.isArray(data)) return 1;
  return data.totalPages ?? 1;
}

function roleValue(role: RoleClaim | undefined) {
  if (typeof role === "string") return role;
  return role?.authority ?? role?.role ?? role?.name ?? "";
}

function memberRoles(member: AdminMember) {
  return [
    member.role,
    member.authority,
    ...(member.authorities ?? []).map(roleValue),
    ...(member.roles ?? []).map(roleValue),
  ]
    .filter(Boolean)
    .map((role) => String(role).replace(/^ROLE_/, ""));
}

function isAdmin(member: AdminMember) {
  return memberRoles(member).some((role) => role.toUpperCase() === "ADMIN");
}

function memberName(member: AdminMember) {
  return member.name || member.nickname || "이름 없음";
}

function memberStatus(member: AdminMember) {
  return member.status || "ACTIVE";
}

function joinedAt(member: AdminMember) {
  return (
    formatDate(
      member.createdAt ||
        member.createdDate ||
        member.created_at ||
        member.joinedAt ||
        undefined,
      true,
    ) || "-"
  );
}

function orderCount(member: AdminMember) {
  return Number(member.totalOrderCount ?? member.orderCount ?? 0);
}

function spentAmount(member: AdminMember) {
  return Number(
    member.totalSpentAmount ??
      member.totalPaymentAmount ??
      member.totalSpent ??
      0,
  );
}

function roleLabel(member: AdminMember) {
  const roles = memberRoles(member);
  if (roles.length === 0) return isAdmin(member) ? "ADMIN" : "MEMBER";
  return Array.from(new Set(roles)).join(", ");
}

export default function AdminMembersClient() {
  const { toast } = useToast();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const endpoint = useCallback((nextPage: number) => {
    const params = new URLSearchParams({
      page: String(nextPage),
      size: String(PAGE_SIZE),
    });
    return `/api/admin/members?${params.toString()}`;
  }, []);

  const loadMembers = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      try {
        const response = await apiFetch(endpoint(nextPage), {
          credentials: "include",
        });
        if (response.status === 401 || response.status === 403) {
          setForbidden(true);
          return;
        }
        if (
          response.status === 404 ||
          response.status === 405 ||
          response.status === 501
        ) {
          toast("백엔드 관리자 회원 API가 아직 연결되지 않았습니다.", "error");
          setMembers([]);
          setTotalElements(0);
          setTotalPages(1);
          return;
        }
        if (!response.ok) throw new Error("ADMIN_MEMBERS_FAILED");

        const data = (await response.json()) as
          | MemberListResponse
          | AdminMember[];
        const nextMembers = readMembers(data);
        setMembers(nextMembers);
        setPage(readPage(data, nextPage));
        setTotalPages(readTotalPages(data));
        setTotalElements(readTotal(data, nextMembers.length));
        setSelectedId((current) =>
          nextMembers.some((member) => member.memberId === current)
            ? current
            : (nextMembers[0]?.memberId ?? null),
        );
      } catch {
        toast("회원 목록을 불러오지 못했습니다.", "error");
      } finally {
        setLoading(false);
      }
    },
    [endpoint, toast],
  );

  useEffect(() => {
    void loadMembers(0);
  }, [loadMembers]);

  const filteredMembers = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return members.filter((member) => {
      const admin = isAdmin(member);
      const status = memberStatus(member).toUpperCase();
      const filterMatched =
        filter === "ALL" ||
        (filter === "ADMIN" && admin) ||
        (filter === "MEMBER" && !admin) ||
        (filter === "INACTIVE" &&
          ["INACTIVE", "WITHDRAWN", "DELETED", "SUSPENDED"].includes(status));

      if (!filterMatched) return false;
      if (!q) return true;

      return [
        member.memberId,
        memberName(member),
        member.email,
        member.phone,
        member.grade,
        roleLabel(member),
        member.status,
      ]
        .filter((value) => value !== undefined && value !== null)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [filter, keyword, members]);

  const selectedMember = useMemo(
    () =>
      filteredMembers.find((member) => member.memberId === selectedId) ??
      filteredMembers[0] ??
      null,
    [filteredMembers, selectedId],
  );

  const stats = useMemo(() => {
    const admins = members.filter(isAdmin).length;
    const inactive = members.filter((member) =>
      ["INACTIVE", "WITHDRAWN", "DELETED", "SUSPENDED"].includes(
        memberStatus(member).toUpperCase(),
      ),
    ).length;
    const points = members.reduce(
      (sum, member) => sum + Number(member.point || 0),
      0,
    );
    return [
      {
        label: "전체 회원",
        value: `${totalElements.toLocaleString("ko-KR")}명`,
        icon: "ri-group-line",
      },
      {
        label: "관리자",
        value: `${admins.toLocaleString("ko-KR")}명`,
        icon: "ri-shield-user-line",
      },
      {
        label: "비활성",
        value: `${inactive.toLocaleString("ko-KR")}명`,
        icon: "ri-user-unfollow-line",
      },
      {
        label: "총 포인트",
        value: `${points.toLocaleString("ko-KR")}P`,
        icon: "ri-coin-line",
      },
    ];
  }, [members, totalElements]);

  return (
    <AdminShell active="/admin/members" title="회원 관리">
      {forbidden ? (
        <ForbiddenState />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => (
              <StatCard key={item.label} {...item} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 p-4 md:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {FILTERS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setFilter(item.key)}
                        className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                          filter === item.key
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="flex min-w-0 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                      <i className="ri-search-line shrink-0 text-gray-400" />
                      <input
                        type="search"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        placeholder="이름, 이메일, 등급 검색"
                        className="min-w-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void loadMembers(page)}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
                    >
                      <i className="ri-refresh-line text-base" />
                      새로고침
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="py-16 text-center text-sm text-gray-400">
                  회원 목록을 불러오는 중...
                </div>
              ) : filteredMembers.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                      <tr>
                        <th className="px-5 py-3">회원</th>
                        <th className="px-5 py-3">등급</th>
                        <th className="px-5 py-3">권한</th>
                        <th className="px-5 py-3">주문</th>
                        <th className="px-5 py-3">누적 결제</th>
                        <th className="px-5 py-3">가입일</th>
                        <th className="px-5 py-3">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {filteredMembers.map((member) => {
                        const selected =
                          selectedMember?.memberId === member.memberId;
                        return (
                          <tr
                            key={member.memberId ?? member.email}
                            onClick={() =>
                              setSelectedId(member.memberId ?? null)
                            }
                            className={`cursor-pointer transition-colors ${selected ? "bg-primary-50/70" : "hover:bg-gray-50/70"}`}
                          >
                            <td className="px-5 py-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                                  {memberName(member).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-gray-900">
                                    {memberName(member)}
                                  </p>
                                  <p className="mt-0.5 truncate text-xs text-gray-400">
                                    {member.email || "-"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700">
                                {member.grade || "BASIC"}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${isAdmin(member) ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
                              >
                                {roleLabel(member)}
                              </span>
                            </td>
                            <td className="px-5 py-3 tabular-nums">
                              {orderCount(member).toLocaleString("ko-KR")}건
                            </td>
                            <td className="px-5 py-3 font-semibold text-gray-900">
                              {won(spentAmount(member))}
                            </td>
                            <td className="px-5 py-3 text-gray-500">
                              {joinedAt(member)}
                            </td>
                            <td className="px-5 py-3">
                              <StatusBadge status={memberStatus(member)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => void loadMembers(Math.max(0, page - 1))}
                  disabled={page <= 0 || loading}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-40"
                >
                  이전
                </button>
                <span className="text-xs text-gray-400">
                  {page + 1} / {Math.max(1, totalPages)}
                </span>
                <button
                  type="button"
                  onClick={() => void loadMembers(page + 1)}
                  disabled={page + 1 >= totalPages || loading}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </section>

            <MemberDetail member={selectedMember} loading={loading} />
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
          <i className={`${icon} text-lg`} />
        </span>
      </div>
      <p className="truncate text-xl font-bold text-gray-950">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const inactive = ["INACTIVE", "WITHDRAWN", "DELETED", "SUSPENDED"].includes(
    normalized,
  );
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${inactive ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
    >
      {inactive ? "비활성" : "활성"}
    </span>
  );
}

function MemberDetail({
  member,
  loading,
}: {
  member: AdminMember | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <aside className="rounded-xl border border-gray-100 bg-white p-5 text-center text-sm text-gray-400 shadow-sm">
        회원 정보를 불러오는 중...
      </aside>
    );
  }

  if (!member) {
    return (
      <aside className="rounded-xl border border-gray-100 bg-white p-5 text-center text-sm text-gray-400 shadow-sm">
        선택된 회원이 없습니다.
      </aside>
    );
  }

  return (
    <aside className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-900 text-lg font-bold text-white">
            {memberName(member).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-950">
              {memberName(member)}
            </h2>
            <p className="mt-0.5 truncate text-sm text-gray-500">
              {member.email || "-"}
            </p>
          </div>
        </div>
        <StatusBadge status={memberStatus(member)} />
      </div>

      <dl className="mt-5 space-y-3 border-t border-gray-100 pt-5 text-sm">
        <DetailLine
          label="회원번호"
          value={member.memberId ? `#${member.memberId}` : "-"}
        />
        <DetailLine label="권한" value={roleLabel(member)} />
        <DetailLine label="등급" value={member.grade || "BASIC"} />
        <DetailLine
          label="포인트"
          value={`${Number(member.point || 0).toLocaleString("ko-KR")}P`}
          strong
        />
        <DetailLine
          label="주문 수"
          value={`${orderCount(member).toLocaleString("ko-KR")}건`}
        />
        <DetailLine label="누적 결제" value={won(spentAmount(member))} strong />
        <DetailLine
          label="보유 쿠폰"
          value={`${Number(member.couponCount || 0).toLocaleString("ko-KR")}장`}
        />
        <DetailLine
          label="사용 가능 쿠폰"
          value={`${Number(member.availableCouponCount || 0).toLocaleString("ko-KR")}장`}
        />
        <DetailLine label="연락처" value={member.phone || "-"} />
        <DetailLine label="가입일" value={joinedAt(member)} />
        <DetailLine
          label="최근 로그인"
          value={
            formatDate(
              member.lastLoginAt || member.lastLoginDate || undefined,
              true,
            ) || "-"
          }
        />
        <DetailLine label="가입 채널" value={member.provider || "-"} />
      </dl>

      {(member.address || member.defaultAddress) && (
        <div className="mt-5 rounded-lg bg-gray-50 px-4 py-3">
          <p className="text-xs font-semibold text-gray-500">기본 주소</p>
          <p className="mt-1 break-keep text-sm font-medium leading-6 text-gray-800">
            {member.address || member.defaultAddress}
          </p>
        </div>
      )}
    </aside>
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
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd
        className={`min-w-0 text-right ${strong ? "font-bold text-gray-950" : "font-semibold text-gray-700"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function ForbiddenState() {
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

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <i className="ri-group-line mb-3 block text-4xl text-gray-300" />
      <p className="text-sm font-semibold text-gray-700">
        조건에 맞는 회원이 없습니다.
      </p>
      <p className="mt-1 text-xs text-gray-400">
        필터나 검색어를 조정해보세요.
      </p>
    </div>
  );
}
