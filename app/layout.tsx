import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Providers from "./providers";
import Navbar from "../components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ounce",
  description: "1인 가구를 위한 집밥 밀키트 구독",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Pacifico&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <Providers>
          <Suspense
            fallback={
              <div
                aria-hidden="true"
                className="fixed left-0 right-0 top-0 z-50 h-20 border-b border-background-200/70 bg-background-cream/95 backdrop-blur-md md:h-24"
              />
            }
          >
            <Navbar />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}
