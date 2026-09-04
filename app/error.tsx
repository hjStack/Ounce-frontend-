"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
    error,
    retry,
}: {
    error: Error & { digest?: string };
    retry: () => void;
}) {
    useEffect(() => {
        console.error("Route render error:", error);
    }, [error]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-background-cream px-6 py-28 text-foreground-950">
            <section className="w-full max-w-xl">
                <span className="inline-flex items-center rounded-full border border-deal-200 bg-white px-3 py-1.5 text-xs font-bold text-deal-700 shadow-sm">
                    500
                </span>
                <h1 className="mt-5 break-keep text-4xl font-black leading-tight md:text-5xl">
                    개발자가 화면 수정중입니다!
                </h1>
                <p className="mt-5 break-keep text-base leading-7 text-foreground-600">
                    일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => retry()}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-600"
                    >
                        <i className="ri-refresh-line text-base" />
                        다시 시도
                    </button>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-lg border border-background-300 bg-white px-5 py-3 text-sm font-bold text-foreground-700 transition-colors hover:border-primary-300 hover:text-primary-700"
                    >
                        <i className="ri-home-4-line text-base" />
                        홈으로 이동
                    </Link>
                </div>
            </section>
        </main>
    );
}
