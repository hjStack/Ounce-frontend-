"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Footer from "../../components/Footer";
import { useAuth } from "../../components/AuthContext";
import { useToast } from "../../components/ToastContext";
import {
  markSignupBenefitToastPending,
  readSignupBenefitToastMode,
} from "../../lib/signup-benefits";
import { apiFetch } from "@/lib/api";

const LOGIN_FAILED_MESSAGE = "이메일 또는 비밀번호가 올바르지 않습니다.";
const WITHDRAWN_MESSAGE = "아이디를 찾을 수 없습니다.";

function normalizeLoginError(rawMessage: string) {
  const message = rawMessage.toLowerCase();
  if (
    rawMessage.includes("탈퇴") ||
    rawMessage.includes("삭제") ||
    message.includes("withdraw") ||
    message.includes("deleted")
  ) {
    return WITHDRAWN_MESSAGE;
  }
  return LOGIN_FAILED_MESSAGE;
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcome = searchParams.get("welcome") === "true";
  const { refresh } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // const handleKakaoPreviewClick = () => {
  //   toast("카카오톡 로그인은 아직 준비 중입니다.", "error");
  // };

  useEffect(() => {
    if (!welcome) return;
    markSignupBenefitToastPending("expected");
    toast("가입이 완료됐습니다. 로그인하면 혜택을 확인할 수 있어요.");
  }, [toast, welcome]);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isInApp =
      ua.includes("kakaotalk") ||
      ua.includes("instagram") ||
      ua.includes("line") ||
      ua.includes("fban") ||
      ua.includes("fbav") ||
      ua.includes("naver");

    if (!isInApp) return;
    toast(
      "구글 로그인은 앱 내 브라우저에서 지원되지 않을 수 있습니다.",
      "error",
    );
  }, [toast]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      const message = "이메일을 입력해주세요.";
      toast(message, "error");
      return;
    }
    if (!trimmedEmail.includes("@")) {
      const message = "이메일에 @를 포함해주세요.";
      toast(message, "error");
      return;
    }
    if (!password) {
      const message = "비밀번호를 입력해주세요.";
      toast(message, "error");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch("/api/members/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      const isLoginSuccess =
        response.ok &&
        !response.redirected &&
        !contentType.includes("text/html");

      if (isLoginSuccess) {
        if (!readSignupBenefitToastMode()) {
          toast("오늘도 맛있는 하루! Ounce와 함께 열어볼까요?");
        }
        await refresh();
        window.setTimeout(() => router.push("/"), 700);
      } else {
        const rawMessage = await response.text().catch(() => "");
        const message = normalizeLoginError(rawMessage);
        toast(message, "error");
      }
    } catch {
      const message = "서버와 통신 중 문제가 발생했습니다.";
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background-100">
      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-24 md:pt-28">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-background-200 bg-white p-8 shadow-sm md:p-10">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground-950">로그인</h1>
              <p className="mt-1 text-sm text-foreground-500">
                Ounce에 오신 것을 환영합니다
              </p>
            </div>

            <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-foreground-700"
                >
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="이메일을 입력하세요"
                  className="w-full rounded-lg border border-background-200 bg-background-50 px-4 py-3 text-foreground-900 outline-none transition-colors placeholder:text-foreground-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-foreground-700"
                >
                  비밀번호
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full rounded-lg border border-background-200 bg-background-50 px-4 py-3 pr-12 text-foreground-900 outline-none transition-colors placeholder:text-foreground-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 transition-colors hover:text-foreground-600"
                    aria-label="비밀번호 표시"
                  >
                    <i
                      className={`${showPassword ? "ri-eye-off-line" : "ri-eye-line"} text-lg`}
                    />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-lg bg-ink-500 py-3.5 font-medium text-white transition-colors hover:bg-ink-600 disabled:opacity-50"
              >
                {submitting ? "로그인 중..." : "로그인"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/forgot-password"
                className="text-xs text-stone-600 hover:text-stone-600"
              >
                비밀번호 찾기
              </Link>
            </div>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-background-200" />
              <span className="text-xs text-foreground-400">또는</span>
              <div className="h-px flex-1 bg-background-200" />
            </div>

            <div className="flex flex-col gap-3">
              {/* <button
                type="button"
                onClick={handleKakaoPreviewClick}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] py-3 text-sm font-bold text-[#191919] transition-colors hover:bg-[#f7dc00]"
              >
                <i className="ri-kakao-talk-fill text-base" />
                카카오톡으로 계속하기
              </button> */}

              <a
                href="/oauth2/authorization/google"
                onClick={() => markSignupBenefitToastPending("oauth-login")}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-background-200 py-3 text-sm font-medium text-foreground-700 transition-colors hover:bg-background-50"
              >
                <i className="ri-google-fill text-base" /> Google로 계속하기
              </a>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-foreground-500">
                아직 계정이 없으신가요?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-stone-600 hover:text-stone-600"
                >
                  회원가입
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
