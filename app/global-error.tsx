"use client";

import Link from "next/link";
import { useEffect } from "react";

const pageStyle = {
    minHeight: "100vh",
    margin: 0,
    background: "#fcfbf9",
    color: "#0c0a09",
    fontFamily:
        '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
};

const mainStyle = {
    boxSizing: "border-box" as const,
    display: "flex",
    minHeight: "100vh",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
};

const contentStyle = {
    width: "100%",
    maxWidth: "560px",
};

const badgeStyle = {
    display: "inline-flex",
    border: "1px solid #f5c7b2",
    borderRadius: "999px",
    background: "#ffffff",
    padding: "6px 12px",
    color: "#9c3f15",
    fontSize: "12px",
    fontWeight: 800,
};

const titleStyle = {
    margin: "20px 0 0",
    fontSize: "clamp(36px, 7vw, 52px)",
    lineHeight: 1.15,
    fontWeight: 900,
    wordBreak: "keep-all" as const,
};

const descriptionStyle = {
    margin: "20px 0 0",
    color: "#57534e",
    fontSize: "16px",
    lineHeight: 1.75,
    wordBreak: "keep-all" as const,
};

const actionsStyle = {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "12px",
    marginTop: "32px",
};

const primaryButtonStyle = {
    border: 0,
    borderRadius: "8px",
    background: "#2f7a5f",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 800,
    padding: "12px 20px",
};

const secondaryLinkStyle = {
    border: "1px solid #d9d6d0",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#44403c",
    display: "inline-flex",
    fontSize: "14px",
    fontWeight: 800,
    padding: "12px 20px",
    textDecoration: "none",
};

export default function GlobalError({
    error,
    retry,
}: {
    error: Error & { digest?: string };
    retry: () => void;
}) {
    useEffect(() => {
        console.error("Root render error:", error);
    }, [error]);

    return (
        <html lang="ko">
            <body style={pageStyle}>
                <title>서비스 오류 | Ounce</title>
                <main style={mainStyle}>
                    <section style={contentStyle}>
                        <span style={badgeStyle}>500</span>
                        <h1 style={titleStyle}>개발자가 화면 수정중입니다!</h1>
                        <p style={descriptionStyle}>
                            일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
                        </p>
                        <div style={actionsStyle}>
                            <button type="button" onClick={() => retry()} style={primaryButtonStyle}>
                                다시 시도
                            </button>
                            <Link href="/" style={secondaryLinkStyle}>
                                홈으로 이동
                            </Link>
                        </div>
                    </section>
                </main>
            </body>
        </html>
    );
}
