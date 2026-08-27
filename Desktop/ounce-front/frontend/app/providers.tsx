"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "../components/AuthContext";
import { CartProvider } from "../components/CartContext";
import { ToastProvider } from "../components/ToastContext";

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <ToastProvider>
            <AuthProvider>
                <CartProvider>{children}</CartProvider>
            </AuthProvider>
        </ToastProvider>
    );
}
