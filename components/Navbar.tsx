"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";
import { CATEGORIES } from "../lib/products";

/* 원본은 데스크탑이 ?categories= , 모바일이 ?cat= 을 써서 서로 달랐음.
   서버 컨트롤러가 받는 파라미터명으로 아래 상수만 맞추면 됨. */
const CATEGORY_PARAM = "categories";

const categoryHref = (slug: string) => `/products?${CATEGORY_PARAM}=${slug}`;

const SUGGESTED_KEYWORDS = ["찌개", "파스타", "마라탕", "밀키트", "1인분"];

const DESKTOP_LINK =
    "text-sm font-medium text-foreground-600 hover:text-foreground-950 transition-colors whitespace-nowrap";
const DESKTOP_LINK_ACTIVE =
    "text-sm font-bold text-foreground-950 transition-colors whitespace-nowrap";

export default function Navbar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const query = searchParams.toString();
    const currentPath = query ? `${pathname}?${query}` : pathname;

    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const { count: cartCount } = useCart();
    const displayName = user?.email ? user.email.split("@")[0] : "사용자";
    const hidden = pathname.startsWith("/admin") || pathname === "/login" || pathname === "/signup";
    const isTimeDeal = pathname === "/timedeal";

    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuWrapRef = useRef<HTMLDivElement>(null);

    const [searchMounted, setSearchMounted] = useState(false);
    const [searchVisible, setSearchVisible] = useState(false);
    const [keyword, setKeyword] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const showAuthenticated = isAuthenticated;
    const showAdmin = isAdmin;
    const showGuest = !isAuthenticated;

    // 라우트가 바뀌면 열려 있던 메뉴/오버레이를 모두 닫는다
    useEffect(() => {
        setMobileOpen(false);
        setUserMenuOpen(false);
        setSearchVisible(false);
        setSearchMounted(false);
    }, [pathname, query]);

    useEffect(() => {
        if (!userMenuOpen) return;
        const onClick = (e: MouseEvent) => {
            if (!userMenuWrapRef.current?.contains(e.target as Node)) setUserMenuOpen(false);
        };
        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, [userMenuOpen]);

    const openSearch = () => {
        clearTimeout(closeTimerRef.current);
        setMobileOpen(false);
        setSearchMounted(true);
        requestAnimationFrame(() => setSearchVisible(true));
        setTimeout(() => searchInputRef.current?.focus(), 100);
    };

    const closeSearch = useCallback(() => {
        setSearchVisible(false);
        closeTimerRef.current = setTimeout(() => setSearchMounted(false), 200);
    }, []);

    useEffect(() => () => clearTimeout(closeTimerRef.current), []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeSearch();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [closeSearch]);

    const submitSearch = () => {
        const q = keyword.trim();
        if (!q) return;
        router.push(`/products?keyword=${encodeURIComponent(q)}`);
        setKeyword("");
        closeSearch();
    };

    const handleLogout = async () => {
        await logout();
        router.push("/");
        router.refresh();
    };

    const linkClass = (href: string) => {
        const active = currentPath === href;
        if (isTimeDeal) {
            return active
                ? "timedeal-nav-text text-sm font-bold text-white transition-colors whitespace-nowrap"
                : "timedeal-nav-text text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap";
        }
        return active ? DESKTOP_LINK_ACTIVE : DESKTOP_LINK;
    };
    const ariaCurrent = (href: string) =>
        currentPath === href ? ("page" as const) : undefined;

    if (hidden) return null;

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b ${
                isTimeDeal ? "bg-black/95 border-white/10" : "bg-background-cream/90 border-background-200/70"
            }`}
        >
            <div className="w-full px-4 md:px-8 lg:px-12">
                <div className="flex items-center justify-between h-20 md:h-24">
                    <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className={`text-xl md:text-2xl font-semibold font-heading tracking-tight ${isTimeDeal ? "timedeal-nav-text text-white" : "text-foreground-950"}`}>
              Ounce
            </span>
                    </Link>

                    {/* 데스크탑 내비게이션 */}
                    <div className="hidden md:flex items-center gap-7">
                        <Link
                            href="/products"
                            className={linkClass("/products")}
                            aria-current={ariaCurrent("/products")}
                        >
                            전체 밀키트
                        </Link>

                        {CATEGORIES.filter((c) => c.desktop).map((c) => {
                            const href = categoryHref(c.key);
                            return (
                                <Link
                                    key={c.key}
                                    href={href}
                                    className={linkClass(href)}
                                    aria-current={ariaCurrent(href)}
                                >
                                    {c.label}
                                </Link>
                            );
                        })}

                        {/* 미드나이트 강조 */}
                        <Link
                            href="/timedeal"
                            aria-current={ariaCurrent("/timedeal")}
                            className={
                                currentPath === "/timedeal"
                                    ? `flex items-center gap-1.5 text-sm font-bold transition-colors whitespace-nowrap ${
                                          isTimeDeal ? "timedeal-nav-text text-white" : "text-foreground-950"
                                      }`
                                    : `flex items-center gap-1.5 text-sm font-bold transition-colors whitespace-nowrap ${
                                          isTimeDeal ? "timedeal-nav-text text-white hover:text-white" : "text-indigo-600 hover:text-indigo-800"
                                      }`
                            }
                        >
                            <i className="ri-moon-fill text-indigo-500 text-lg" />
                            미드나이트
                        </Link>
                    </div>

                    <div className="flex items-center gap-3 md:gap-4">
                        {showAdmin && (
                            <Link
                                href="/admin"
                                className="hidden md:flex items-center gap-1.5 rounded-full bg-deal-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-deal-500/25 transition-colors hover:bg-deal-600"
                            >
                                <i className="ri-dashboard-3-line text-sm" /> 관리자
                            </Link>
                        )}

                        {showAuthenticated && (
                            <div className="relative" ref={userMenuWrapRef}>
                                <button
                                    type="button"
                                    onClick={() => setUserMenuOpen((v) => !v)}
                                    aria-expanded={userMenuOpen}
                                    className={`group flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer ${
                                        isTimeDeal ? "timedeal-nav-text text-white/85 hover:text-white" : "text-foreground-700 hover:text-foreground-950"
                                    }`}
                                >
                                    <span className="whitespace-nowrap">{displayName}</span>
                                    <span className={isTimeDeal ? "timedeal-nav-text text-white/60" : "text-foreground-500"}>님</span>
                                    <i
                                        className={`ri-arrow-down-s-line text-sm transition-transform duration-200 group-hover:translate-y-0.5 ${
                                            isTimeDeal ? "text-white/50 group-hover:text-white/80" : "text-foreground-400 group-hover:text-foreground-600"
                                        }`}
                                    />
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-background-200 rounded-xl shadow-lg overflow-hidden z-50 py-1">
                                        <Link
                                            href="/subscription"
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground-700 hover:bg-background-100 transition-colors"
                                        >
                                            <i className="ri-calendar-check-line text-foreground-400 text-base" /> 내 구독
                                        </Link>
                                        <Link
                                            href="/account"
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground-700 hover:bg-background-100 transition-colors"
                                        >
                                            <i className="ri-user-line text-foreground-400 text-base" /> 내 계정
                                        </Link>
                                        <Link
                                            href="/orders"
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground-700 hover:bg-background-100 transition-colors"
                                        >
                                            <i className="ri-file-list-3-line text-foreground-400 text-base" /> 주문 내역
                                        </Link>
                                        <Link
                                            href="/support"
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground-700 hover:bg-background-100 transition-colors"
                                        >
                                            <i className="ri-customer-service-2-line text-foreground-400 text-base" /> 고객센터
                                        </Link>

                                        {showAdmin && (
                                            <Link
                                                href="/admin/qna"
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground-700 hover:bg-background-100 transition-colors"
                                            >
                                                <i className="ri-shield-user-line text-foreground-400 text-base" /> 문의 관리
                                                <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded bg-ink-500 text-white">
                          ADMIN
                        </span>
                                            </Link>
                                        )}

                                        <hr className="my-1 border-background-200" />
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors text-left cursor-pointer"
                                        >
                                            <i className="ri-logout-box-r-line text-base" /> 로그아웃
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {showGuest && (
                            <Link
                                href="/login"
                                className={`text-sm font-medium transition-colors whitespace-nowrap tracking-wide ${
                                    isTimeDeal ? "timedeal-nav-text text-white/80 hover:text-white" : "text-foreground-600 hover:text-foreground-950"
                                }`}
                            >
                                로그인
                            </Link>
                        )}

                        <button
                            type="button"
                            onClick={openSearch}
                            className={`transition-colors ${isTimeDeal ? "timedeal-nav-text text-white/80 hover:text-white" : "text-foreground-700 hover:text-primary-500"}`}
                            aria-label="검색"
                        >
                            <i className="ri-search-line text-xl" />
                        </button>

                        {/* group 클래스 추가 — 원본은 빠져 있어서 아이콘 hover 가 안 먹었음 */}
                        <Link
                            href="/cart"
                            className={`group relative transition-colors ${isTimeDeal ? "timedeal-nav-text text-white/85 hover:text-white" : ""}`}
                            aria-label="장바구니"
                        >
                            <i className="ri-shopping-cart-2-line text-xl inline-block group-hover:scale-110 transition-transform duration-200" />
                            {cartCount > 0 && (
                                <span
                                    className={`absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#447861] text-white text-[11px] font-bold leading-none tracking-tighter ring-2 shadow-sm transition-all duration-300 ${
                                        isTimeDeal ? "ring-black" : "ring-white"
                                    }`}
                                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
                            )}
                        </Link>
                    </div>

                    <button
                        type="button"
                        onClick={() => setMobileOpen((v) => !v)}
                        aria-expanded={mobileOpen}
                        aria-label="메뉴"
                        className="md:hidden w-10 h-10 flex items-center justify-center"
                    >
                        <i className={`ri-menu-line text-2xl ${isTimeDeal ? "text-white" : "text-foreground-950"}`} />
                    </button>
                </div>
            </div>

            {/* 모바일 메뉴 */}
            {mobileOpen && (
                <div className="md:hidden bg-background-50/98 backdrop-blur-md border-t border-background-200 shadow-lg">
                    <div className="px-4 py-5">
                        <Link
                            href={showAuthenticated ? "/subscription" : "/subscribe"}
                            className="flex items-center justify-between gap-3 px-4 py-3.5 mb-5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
                        >
              <span className="flex items-center gap-2.5 text-sm font-semibold">
                <i className="ri-calendar-check-line text-lg" />
                  {showAuthenticated ? "내 구독" : "구독 시작"}
              </span>
                            <span className="text-[11px] text-white/70">
                {showAuthenticated ? "이번 주 메뉴 바꾸기" : "한 주 저녁 미리 정하기"}
              </span>
                        </Link>

                        <p className="px-1 mb-2 text-[11px] font-semibold text-foreground-400 tracking-wider uppercase">
                            둘러보기
                        </p>
                        <div className="grid grid-cols-2 gap-2 mb-5">
                            <Link
                                href="/products"
                                className="flex items-center gap-2.5 px-3 py-3.5 text-sm font-medium text-foreground-700 bg-background-100/60 hover:bg-background-100 rounded-xl transition-colors"
                            >
                                <i className="ri-grid-line text-primary-500 text-lg" /> 전체 밀키트
                            </Link>

                            <Link
                                href="/timedeal"
                                className="flex items-center gap-2.5 px-3 py-3.5 text-sm font-bold text-indigo-600 bg-indigo-50/70 hover:bg-indigo-100 rounded-xl transition-colors"
                            >
                                <i className="ri-moon-fill text-indigo-500 text-lg" /> 미드나이트
                            </Link>

                            {CATEGORIES.map((c) => (
                                <Link
                                    key={c.key}
                                    href={categoryHref(c.key)}
                                    className="flex items-center gap-2.5 px-3 py-3.5 text-sm font-medium text-foreground-700 bg-background-100/60 hover:bg-background-100 rounded-xl transition-colors"
                                >
                                    <i className={`${c.icon} text-primary-500 text-lg`} /> {c.label}
                                </Link>
                            ))}
                        </div>

                        <p className="px-1 mb-2 text-[11px] font-semibold text-foreground-400 tracking-wider uppercase">
                            내 계정
                        </p>
                        <div className="flex flex-col gap-0.5">
                            {showGuest && (
                                <Link
                                    href="/login"
                                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground-700 hover:bg-background-100 rounded-xl transition-colors"
                                >
                                    <i className="ri-login-box-line text-foreground-400 text-base" /> 로그인
                                </Link>
                            )}

                            {showAuthenticated && (
                                <>
                                    <Link
                                        href="/account"
                                        className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground-700 hover:bg-background-100 rounded-xl transition-colors"
                                    >
                                        <i className="ri-user-line text-foreground-400 text-base" /> 내 계정
                                    </Link>
                                    <Link
                                        href="/orders"
                                        className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground-700 hover:bg-background-100 rounded-xl transition-colors"
                                    >
                                        <i className="ri-file-list-3-line text-foreground-400 text-base" /> 주문 내역
                                    </Link>
                                </>
                            )}

                            <Link
                                href="/support"
                                className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-foreground-700 hover:bg-background-100 rounded-xl transition-colors"
                            >
                                <i className="ri-customer-service-2-line text-foreground-400 text-base" /> 고객센터
                            </Link>

                            {showAdmin && (
                                <Link
                                    href="/admin"
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-100 transition-colors bg-gray-50"
                                >
                                    <i className="ri-settings-4-line text-gray-500 text-base" /> 관리자 대시보드
                                    <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500 text-white">
                    ADMIN
                  </span>
                                </Link>
                            )}

                            {showAuthenticated && (
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors text-left w-full"
                                >
                                    <i className="ri-logout-box-r-line text-base" /> 로그아웃
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 검색 오버레이 */}
            {searchMounted && (
                <div
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeSearch();
                    }}
                    className={`fixed top-20 md:top-24 left-0 right-0 bottom-0 z-40 bg-foreground-950/40 transition-opacity duration-200 ${
                        searchVisible ? "" : "opacity-0"
                    }`}
                >
                    <div className="w-full px-4 flex justify-center pt-6 md:pt-8">
                        <div
                            className={`w-full max-w-2xl transition-transform duration-200 ${
                                searchVisible ? "" : "-translate-y-3"
                            }`}
                        >
                            <div className="flex items-center gap-3 bg-white rounded-2xl shadow-2xl ring-1 ring-background-200 px-5 py-4 focus-within:ring-2 focus-within:ring-primary-500/40 transition-all">
                                <button
                                    type="button"
                                    onClick={closeSearch}
                                    className="text-foreground-400 hover:text-foreground-700 transition-colors shrink-0"
                                    aria-label="뒤로"
                                >
                                    <i className="ri-arrow-left-line text-xl" />
                                </button>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") submitSearch();
                                    }}
                                    placeholder="밀키트를 검색해보세요"
                                    autoComplete="off"
                                    className="flex-1 bg-transparent text-base text-foreground-950 placeholder-foreground-400 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={closeSearch}
                                    className="text-foreground-400 hover:text-foreground-700 transition-colors shrink-0 md:hidden"
                                    aria-label="닫기"
                                >
                                    <i className="ri-close-line text-2xl" />
                                </button>
                            </div>

                            <div className="mt-3 bg-white/95 backdrop-blur rounded-2xl shadow-xl ring-1 ring-background-200 px-5 py-4">
                                <p className="text-[11px] font-semibold text-foreground-400 tracking-wider uppercase mb-3">
                                    추천 검색어
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {SUGGESTED_KEYWORDS.map((k) => (
                                        <Link
                                            key={k}
                                            href={`/products?keyword=${encodeURIComponent(k)}`}
                                            className="px-3 py-1.5 text-sm text-foreground-600 bg-background-100/70 hover:bg-primary-500 hover:text-white rounded-full transition-colors"
                                        >
                                            {k}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
