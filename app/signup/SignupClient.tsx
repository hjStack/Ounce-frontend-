"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import Footer from "../../components/Footer";
import { useToast } from "../../components/ToastContext";

interface Errors {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}

export default function SignupClient() {
    const router = useRouter();
    const { toast } = useToast();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<Errors>({});
    const [submitting, setSubmitting] = useState(false);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrors({});

        if (!name.trim()) {
            setErrors({ name: "이름을 입력해주세요." });
            toast("이름을 입력해주세요.", "error");
            return;
        }
        if (!email.trim()) {
            setErrors({ email: "이메일을 입력해주세요." });
            toast("이메일을 입력해주세요.", "error");
            return;
        }
        if (!password) {
            setErrors({ password: "비밀번호를 입력해주세요." });
            toast("비밀번호를 입력해주세요.", "error");
            return;
        }
        if (!confirmPassword) {
            setErrors({ confirmPassword: "비밀번호 확인을 입력해주세요." });
            toast("비밀번호 확인을 입력해주세요.", "error");
            return;
        }
        if (password !== confirmPassword) {
            setErrors({ confirmPassword: "비밀번호가 일치하지 않습니다." });
            toast("비밀번호가 일치하지 않습니다.", "error");
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch("/api/members/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, name }),
            });

            if (response.ok || response.status === 201) {
                router.push("/login?welcome=true");
            } else if (response.status === 400 || response.status === 409) {
                const data = (await response.json().catch(() => null)) as { message?: string } | null;
                const message = data?.message || "회원가입에 실패했습니다.";
                if (message.includes("비밀번호")) setErrors({ password: message });
                else if (message.includes("이메일")) setErrors({ email: message });
                toast(message, "error");
            } else {
                toast("회원가입에 실패했습니다.", "error");
            }
        } catch {
            toast("서버와 통신 중 문제가 발생했습니다.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-background-100">
            <main className="flex flex-1 justify-center px-4 pb-12 pt-24 md:pt-28">
                <div className="w-full max-w-xl">
                    <div className="overflow-hidden rounded-2xl border border-background-200 bg-white shadow-sm">
                        <div className="border-b border-primary-100 bg-primary-50/80 p-5 md:p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-[11px] font-extrabold text-primary-700">
                                        <i className="ri-time-line text-sm" />
                                        오픈 3주 한정
                                    </span>
                                    <h2 className="mt-3 break-keep text-xl font-black leading-tight text-foreground-950">
                                        회원가입하면 첫 구매 배송비 0원
                                    </h2>
                                    <p className="mt-2 break-keep text-sm leading-5 text-foreground-500">
                                        가입 완료 후 1,000P와 무료배송 쿠폰이 함께 지급돼요.
                                    </p>
                                </div>

                                <div className="flex shrink-0 items-center justify-between rounded-lg bg-primary-500 px-4 py-3 text-white shadow-sm sm:w-28 sm:flex-col sm:justify-center sm:py-4">
                                    <span className="text-[11px] font-bold text-white/75">배송비</span>
                                    <strong className="text-2xl font-black leading-none">0원</strong>
                                    <span className="hidden text-[10px] font-bold text-white/75 sm:block">FREE</span>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-2 text-[11px] font-bold text-foreground-600 sm:grid-cols-3">
                                <span className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-2">
                                    <i className="ri-coupon-3-line text-primary-600" />
                                    첫 구매 전용
                                </span>
                                <span className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-2">
                                    <i className="ri-gift-line text-primary-600" />
                                    가입 1,000P
                                </span>
                                <span className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-2">
                                    <i className="ri-loop-left-line text-primary-600" />
                                    4주 유지 추가 쿠폰
                                </span>
                            </div>

                            <p className="mt-3 flex items-center gap-1.5 break-keep text-[11px] font-bold text-primary-700">
                                <i className="ri-truck-line text-sm" />
                                3만원 이상 주문은 언제나 무료배송
                            </p>
                        </div>

                        <div id="signup-form" className="scroll-mt-24 p-8 md:p-10">
                            <div className="mb-8">
                                <h1 className="text-2xl font-bold text-foreground-950">회원가입</h1>
                                <p className="mt-1 text-sm text-foreground-500">Ounce의 회원이 되어 특별한 혜택을 받아보세요</p>
                            </div>

                            <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
                                <Field
                                    id="name"
                                    label="이름"
                                    value={name}
                                    error={errors.name}
                                    placeholder="이름을 입력하세요"
                                    onChange={setName}
                                />
                                <Field
                                    id="email"
                                    type="email"
                                    label="이메일"
                                    value={email}
                                    error={errors.email}
                                    placeholder="이메일 (예: example@ounce.com)을 입력하세요"
                                    onChange={setEmail}
                                />
                                <PasswordField
                                    id="password"
                                    label="비밀번호"
                                    value={password}
                                    error={errors.password}
                                    placeholder="8자 이상 입력하세요"
                                    show={showPassword}
                                    onToggle={() => setShowPassword((value) => !value)}
                                    onChange={setPassword}
                                />
                                <PasswordField
                                    id="confirmPassword"
                                    label="비밀번호 확인"
                                    value={confirmPassword}
                                    error={errors.confirmPassword}
                                    placeholder="비밀번호를 다시 입력하세요"
                                    show={showConfirmPassword}
                                    onToggle={() => setShowConfirmPassword((value) => !value)}
                                    onChange={setConfirmPassword}
                                />

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="mt-2 w-full rounded-lg bg-ink-500 py-3.5 font-medium text-white transition-colors hover:bg-ink-600 disabled:opacity-50"
                                >
                                    {submitting ? "가입 중..." : "회원가입하고 혜택 받기"}
                                </button>
                            </form>

                            <div className="my-6 flex items-center gap-4">
                                <div className="h-px flex-1 bg-background-200" />
                                <span className="text-xs text-foreground-400">또는</span>
                                <div className="h-px flex-1 bg-background-200" />
                            </div>

                            <a
                                href="/oauth2/authorization/google"
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-background-200 py-3 text-sm font-medium text-foreground-700 transition-colors hover:bg-background-50"
                            >
                                <i className="ri-google-fill text-base" /> Google로 계속하기
                            </a>

                            <div className="mt-6 text-center">
                                <p className="text-sm text-foreground-500">
                                    이미 계정이 있으신가요?{" "}
                                    <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
                                        로그인
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

function Field({
    id,
    label,
    value,
    placeholder,
    error,
    onChange,
    type = "text",
}: {
    id: string;
    label: string;
    value: string;
    placeholder: string;
    error?: string;
    onChange: (value: string) => void;
    type?: string;
}) {
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground-700">
                {label}
            </label>
            <input
                id={id}
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className={`field-input w-full rounded-lg border bg-background-50 px-4 py-3 text-foreground-900 outline-none transition-colors placeholder:text-foreground-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 ${
                    error ? "error-input border-red-500" : "border-background-200"
                }`}
            />
        </div>
    );
}

function PasswordField({
    id,
    label,
    value,
    placeholder,
    error,
    show,
    onToggle,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    placeholder: string;
    error?: string;
    show: boolean;
    onToggle: () => void;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground-700">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={placeholder}
                    className={`field-input w-full rounded-lg border bg-background-50 px-4 py-3 pr-12 text-foreground-900 outline-none transition-colors placeholder:text-foreground-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 ${
                        error ? "error-input border-red-500" : "border-background-200"
                    }`}
                />
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 transition-colors hover:text-foreground-600"
                    aria-label="비밀번호 표시"
                >
                    <i className={`${show ? "ri-eye-off-line" : "ri-eye-line"} text-lg`} />
                </button>
            </div>
        </div>
    );
}
