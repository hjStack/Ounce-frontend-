"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "../components/AuthContext";
import { CartProvider } from "../components/CartContext";
import SignupBenefitToast from "../components/SignupBenefitToast";
import { ToastProvider } from "../components/ToastContext";

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <ToastProvider>
            <AuthProvider>
                <CartProvider>{children}</CartProvider>
                <SignupBenefitToast />
            </AuthProvider>
        </ToastProvider>
    );
}
