"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import Footer from "../../components/Footer";
import { useToast } from "../../components/ToastContext";
import { apiFetch } from "@/lib/api";

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 8) {
      toast("비밀번호는 8자 이상이어야 합니다.", "error");
      return;
    }
    if (password !== confirm) {
      toast("비밀번호가 일치하지 않습니다.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch("/api/members/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (response.ok) {
        toast("비밀번호가 변경됐습니다. 다시 로그인해주세요.");
        window.setTimeout(() => router.push("/login"), 700);
      } else {
        toast(
          "링크가 만료됐거나 유효하지 않습니다. 다시 요청해주세요.",
          "error",
        );
      }
    } catch {
      toast("서버와 통신 중 문제가 발생했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col bg-background-100">
        <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-24 md:pt-28">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-background-200 bg-white p-8 text-center shadow-sm md:p-10">
              <h1 className="text-2xl font-bold text-foreground-950">
                유효하지 않은 링크입니다
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-foreground-500">
                링크가 손상됐거나 만료됐습니다.
                <br />
                비밀번호 재설정을 다시 요청해주세요.
              </p>
              <Link
                href="/forgot-password"
                className="mt-8 block w-full rounded-lg bg-ink-500 py-3.5 text-center font-medium text-white transition-colors hover:bg-ink-600"
              >
                다시 요청하기
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background-100">
      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-24 md:pt-28">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-background-200 bg-white p-8 shadow-sm md:p-10">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground-950">
                새 비밀번호 설정
              </h1>
              <p className="mt-1 text-sm text-foreground-500">
                사용하실 새 비밀번호를 입력해주세요.
              </p>
            </div>

            <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-foreground-700"
                >
                  새 비밀번호
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="8자 이상 입력하세요"
                    autoComplete="new-password"
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

              <div>
                <label
                  htmlFor="confirm"
                  className="mb-1.5 block text-sm font-medium text-foreground-700"
                >
                  비밀번호 확인
                </label>
                <div className="relative">
                  <input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    placeholder="비밀번호를 다시 입력하세요"
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-background-200 bg-background-50 px-4 py-3 pr-12 text-foreground-900 outline-none transition-colors placeholder:text-foreground-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 transition-colors hover:text-foreground-600"
                    aria-label="비밀번호 확인 표시"
                  >
                    <i
                      className={`${showConfirm ? "ri-eye-off-line" : "ri-eye-line"} text-lg`}
                    />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-lg bg-ink-500 py-3.5 font-medium text-white transition-colors hover:bg-ink-600 disabled:opacity-50"
              >
                {submitting ? "변경 중..." : "비밀번호 변경"}
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}