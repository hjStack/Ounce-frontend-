import Link from "next/link";
import AdminShell from "./AdminShell";

const STATS = [
    { label: "오늘 매출", value: "1,245,000원", icon: "ri-money-dollar-circle-line", color: "blue", note: "어제 대비 12% 증가" },
    { label: "신규 주문", value: "42건", icon: "ri-shopping-bag-3-line", color: "green", note: "결제대기 3건 포함" },
    { label: "배송 준비중", value: "18건", icon: "ri-truck-line", color: "orange", note: "오늘 자정 출고 마감" },
    { label: "미답변 문의", value: "5건", icon: "ri-question-answer-line", color: "red", note: "답변 대기 문의" },
];

const RECENT_ORDERS = [
    ["ORD-20260827-001", "홍길동", "[1인분] 소불고기 밀키트 외 2건", "42,500원", "결제완료"],
    ["ORD-20260827-002", "김철수", "[1인분] 명란 크림 우동 밀키트", "10,900원", "배송준비"],
];

const STAT_COLOR_CLASSES: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
};

export default function AdminPage() {
    return (
        <AdminShell active="/admin" title="대시보드">
            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {STATS.map((item) => (
                    <div key={item.label} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-medium text-gray-500">{item.label}</h2>
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${STAT_COLOR_CLASSES[item.color]}`}>
                                <i className={`${item.icon} text-xl`} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                        <p className="mt-2 text-xs text-gray-500">{item.note}</p>
                    </div>
                ))}
            </div>

            <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <h2 className="text-base font-bold text-gray-800">최근 들어온 주문</h2>
                    <Link href="/admin/orders" className="text-sm text-blue-600 hover:underline">
                        전체보기
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-3 font-medium">주문번호</th>
                                <th className="px-6 py-3 font-medium">주문자</th>
                                <th className="px-6 py-3 font-medium">상품명</th>
                                <th className="px-6 py-3 font-medium">결제금액</th>
                                <th className="px-6 py-3 font-medium">상태</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                            {RECENT_ORDERS.map(([id, buyer, product, price, status]) => (
                                <tr key={id}>
                                    <td className="px-6 py-4 font-medium">{id}</td>
                                    <td className="px-6 py-4">{buyer}</td>
                                    <td className="max-w-[220px] truncate px-6 py-4">{product}</td>
                                    <td className="px-6 py-4 font-bold">{price}</td>
                                    <td className="px-6 py-4">
                                        <span className="rounded-md bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">{status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </AdminShell>
    );
}
