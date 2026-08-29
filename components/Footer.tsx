import Link from "next/link";

export default function Footer() {
    return (
        <footer className="w-full bg-[#0b0a09] text-white">
            <div className="mx-auto grid w-full max-w-[1540px] gap-6 px-8 py-8 md:px-12 md:py-10 lg:min-h-[280px] lg:grid-cols-3 lg:gap-12 lg:px-16 lg:pb-8 lg:pt-12 xl:px-20">
                <div>
                    <h3 className="font-heading text-3xl font-semibold leading-none text-white md:text-[34px]">Ounce</h3>
                    <p className="mt-4 break-keep text-xs leading-6 text-white/60">
                        혼자 먹는 한 끼, 딱 1인분으로.
                        <br />
                        손질과 계량 없이, 냄비 하나로 완성되는 집밥.
                    </p>
                </div>

                <div className="lg:pt-6">
                    <h4 className="mb-3 text-sm font-bold text-white/75">주문·배송</h4>
                    <dl className="flex flex-col gap-2.5">
                        {[
                            ["주문 마감", "매일 밤 23:00"],
                            ["도착", "다음 날 새벽 7시 · 수도권"],
                            ["포장", "1인분 정량 소분"],
                            ["보관", "냉장 / 냉동 상품별 표기"],
                        ].map(([label, value]) => (
                            <div key={label} className="flex items-baseline gap-5">
                                <dt className="w-16 shrink-0 text-xs text-white/35">{label}</dt>
                                <dd className="text-sm font-medium text-white/65">{value}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="mt-4 break-keep text-xs leading-6 text-white/40">
                        지역에 따라 배송 방식과 도착 시간이 다를 수 있으며, 주문 마감 전까지 변경·취소가 가능합니다.
                    </p>
                </div>

                <div className="lg:pt-6">
                    <h4 className="mb-3 text-sm font-bold text-white">고객센터</h4>
                    <div className="flex flex-col items-start gap-2.5">
                        <Link
                            href="/support"
                            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/15 px-3 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-white/20"
                        >
                            <i className="ri-customer-service-2-line text-base text-white" />
                            고객센터 · 1:1 문의
                        </Link>
                        <a
                            href="mailto:hye_jun0209@icloud.com"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition-colors hover:text-white"
                        >
                            <i className="ri-mail-line text-base text-white/55" />
                            hye_jun0209@icloud.com
                        </a>
                    </div>
                    <p className="mt-4 break-keep text-xs leading-6 text-white/40">
                        1:1 문의는 365일 접수하며, 영업일 기준 1일 내 답변드립니다.
                    </p>
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-2 px-8 py-3 sm:flex-row sm:items-center sm:justify-between md:px-12 lg:px-16 xl:px-20">
                    <p className="text-xs text-white/40">&copy; 2026 Ounce. All rights reserved.</p>
                    <div className="flex shrink-0 gap-4">
                        <a href="/terms.html" className="text-xs font-semibold text-white/65 transition-colors hover:text-white">
                            이용약관
                        </a>
                        <a href="/policy.html" className="text-xs font-bold text-white transition-colors hover:text-white/80">
                            개인정보처리방침
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
