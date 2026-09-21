"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

import type { CartItem } from "../types/api";

interface CartContextValue {
    items: CartItem[];
    count: number;
    refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const { isAuthenticated } = useAuth();

    const refresh = useCallback(async () => {
        if (!isAuthenticated) {
            setItems([]);
            return;
        }
        try {
            const res = await fetch("/api/carts/items", { credentials: "include" });
            if (!res.ok) return;

            const contentType = res.headers.get("content-type") ?? "";
            if (!contentType.includes("application/json")) return;

            setItems((await res.json()) as CartItem[]);
        } catch (e) {
            console.error("장바구니 개수 조회 실패:", e);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    // 뒤로가기 bfcache 복원 시 재조회
    useEffect(() => {
        const onPageShow = (e: PageTransitionEvent) => {
            if (e.persisted) void refresh();
        };
        window.addEventListener("pageshow", onPageShow);
        return () => window.removeEventListener("pageshow", onPageShow);
    }, [refresh]);

    const count = useMemo(
        () => items.reduce((sum, i) => sum + i.quantity, 0),
        [items]
    );

    const value = useMemo<CartContextValue>(
        () => ({ items, count, refresh }),
        [items, count, refresh]
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart 는 CartProvider 안에서만 쓸 수 있습니다.");
    return ctx;
}
