import Link from "next/link";

export default function AdminNotFound() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                <p className="text-sm font-bold text-gray-400">404</p>
                <h1 className="mt-2 text-2xl font-black text-gray-950">페이지를 찾을 수 없습니다</h1>
                <p className="mt-3 break-keep text-sm leading-6 text-gray-500">
                    요청한 관리자 페이지가 없거나 접근할 수 없는 페이지입니다.
                </p>
                <Link
                    href="/"
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-600"
                >
                    <i className="ri-home-4-line text-base" />
                    홈으로 이동
                </Link>
            </div>
        </main>
    );
}
