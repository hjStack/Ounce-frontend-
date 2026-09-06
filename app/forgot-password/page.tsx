import { Suspense } from "react";
import ForgotPasswordPage from "./forgot-password";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background-100 px-4">
          <div className="w-full max-w-md rounded-2xl border border-background-200 bg-white p-8 shadow-sm md:p-10">
            <div className="flex flex-col items-center">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              </div>

              <h2 className="text-lg font-semibold text-foreground-900">
                잠시만 기다려주세요
              </h2>

              <p className="mt-2 text-center text-sm text-foreground-400">
                비밀번호 찾기 페이지를 불러오고 있어요.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <ForgotPasswordPage />
    </Suspense>
  );
}