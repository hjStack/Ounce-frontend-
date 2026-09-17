import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
    { href: "/admin", label: "대시보드", icon: "ri-dashboard-3-line" },
    { href: "/admin/products", label: "상품 관리", icon: "ri-shopping-bag-3-line" },
    { href: "/admin/timedeal", label: "미드나이트 관리", icon: "ri-moon-line" },
    { href: "/admin/orders", label: "주문 관리", icon: "ri-file-list-3-line" },
    { href: "/admin/members", label: "회원 관리", icon: "ri-group-line" },
    { href: "/admin/qna", label: "문의 및 리뷰", icon: "ri-question-answer-line" },
];

export default function AdminShell({ active, title, children }: { active: string; title: string; children: ReactNode }) {
    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
            <aside className="hidden w-64 shrink-0 flex-col bg-gray-900 text-gray-300 md:flex">
                <div className="flex h-16 items-center bg-gray-950 px-6">
                    <Link href="/admin" className="text-xl font-bold tracking-tight text-white">
                        Ounce <span className="ml-1 text-xs font-normal text-gray-400">Admin</span>
                    </Link>
                </div>
                <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                    {NAV.map((item) => {
                        const on = active === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                                    on ? "bg-gray-800 text-white" : "hover:bg-gray-800 hover:text-white"
                                }`}
                            >
                                <i className={`${item.icon} text-lg text-gray-400 group-hover:text-white`} />
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="bg-gray-950 p-4">
                    <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white">
                        <i className="ri-external-link-line" /> 스토어 홈으로
                    </Link>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="md:hidden text-lg font-bold text-gray-900">
                            Ounce
                        </Link>
                        <h1 className="text-lg font-bold text-gray-800">{title}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/admin/qna" className="hidden rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 sm:inline-flex">
                            문의 관리
                        </Link>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#447861] text-sm font-bold text-white">AD</div>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden bg-gray-50 p-4 md:p-6 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
