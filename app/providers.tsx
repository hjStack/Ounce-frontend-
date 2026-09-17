"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { AuthProvider } from "../components/AuthContext";
import { CartProvider } from "../components/CartContext";
import SignupBenefitToast from "../components/SignupBenefitToast";
import { ToastProvider } from "../components/ToastContext";

const BANNER = String.raw`
  ____  _    _ _   _  _____ ______
 / __ \| |  | | \ | |/ ____|  ____|
| |  | | |  | |  \| | |    | |__
| |  | | |  | | . ' | |    |  __|
| |__| | |__| | |\  | |____| |____
 \____/ \____/|_| \_|\_____|______|

  Ounce 
`;

export default function Providers({ children }: { children: ReactNode }) {
    useEffect(() => {
        try {
            for (const key of [
                "ounce.member.created",
                "ounce.midnight-alert.enabled",
            ]) {
                window.localStorage.removeItem(key);
            }
            for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
                const key = window.localStorage.key(index);
                if (key?.startsWith("ounce.signup-benefit-toast.seen.")) {
                    window.localStorage.removeItem(key);
                }
            }
        } catch {
            // 브라우저 저장소를 사용할 수 없는 환경에서는 건너뛴다.
        }
    }, []);

    useEffect(() => {
        console.info(
            `%c${BANNER}`,
            "color: #2f7a5f; font-weight: 700; font-family: monospace; line-height: 1.2;"
        );
    }, []);

    return (
        <ToastProvider>
            <AuthProvider>
                <CartProvider>{children}</CartProvider>
                <SignupBenefitToast />
            </AuthProvider>
        </ToastProvider>
    );
}
