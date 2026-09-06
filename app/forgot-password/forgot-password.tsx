"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import Footer from "../../components/Footer";
import { useToast } from "../../components/ToastContext";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      toast("이메일을 입력해주세요.", "error");
      return;
    }
    if (!trimmedEmail.includes("@")) {
      toast("이메일에 @를 포함해주세요.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch("/api/members/password/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (response.ok) {
        setSent(true);
      } else {
        toast("잠시 후 다시 시도해주세요.", "error");
      }
    } catch {
      toast("서버와 통신 중 문제가 발생했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background-100">
      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-24 md:pt-28">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-background-200 bg-white p-8 shadow-sm md:p-10">
            {sent ? (
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-background-100">
                  <i className="ri-mail-send-line text-2xl text-foreground-500" />
                </div>
                <h1 className="text-2xl font-bold text-foreground-950">
                  메일을 보냈습니다
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-foreground-500">
                  <span className="font-medium text-foreground-700">
                    {email.trim()}
                  </span>
                  로 비밀번호 재설정 링크를 보냈습니다.
                  <br />
                  메일이 보이지 않으면 스팸함도 확인해주세요.
                </p>
                <p className="mt-4 text-xs text-foreground-400">
                  링크는 30분간 유효합니다.
                </p>

                <Link
                  href="/login"
                  className="mt-8 block w-full rounded-lg bg-ink-500 py-3.5 text-center font-medium text-white transition-colors hover:bg-ink-600"
                >
                  로그인으로 돌아가기
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-foreground-950">
                    비밀번호 찾기
                  </h1>
                  <p className="mt-1 text-sm leading-relaxed text-foreground-500">
                    가입하신 이메일 주소를 입력하시면
                    <br />
                    비밀번호 재설정 링크를 보내드립니다.
                  </p>
                </div>

                <form
                  className="flex flex-col gap-5"
                  onSubmit={submit}
                  noValidate
                >
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
                      autoComplete="email"
                      className="w-full rounded-lg border border-background-200 bg-background-50 px-4 py-3 text-foreground-900 outline-none transition-colors placeholder:text-foreground-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-2 w-full rounded-lg bg-ink-500 py-3.5 font-medium text-white transition-colors hover:bg-ink-600 disabled:opacity-50"
                  >
                    {submitting ? "전송 중..." : "재설정 링크 받기"}
                  </button>
                </form>
                <div className="mt-6">
                <Link
  href="/login"
  className="mt-6 block w-full rounded-lg bg-primary-600 py-3.5 text-center font-medium text-white shadow-sm transition hover:bg-primary-700 hover:shadow-md active:scale-[0.99]"
>
  로그인으로 돌아가기
</Link>
</div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}