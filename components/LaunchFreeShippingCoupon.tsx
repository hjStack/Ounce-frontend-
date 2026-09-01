import Link from "next/link";

type CouponLinkProps = {
    href: string;
    ctaLabel: string;
};

type CouponCardProps = {
    ctaHref?: string;
    ctaLabel?: string;
};

export function LaunchCouponStrip({ href, ctaLabel }: CouponLinkProps) {
    return (
        <div className="border-b border-primary-100 bg-primary-50">
            <div className="mx-auto w-full max-w-7xl px-4 py-3 md:px-8 lg:px-12">
                <Link href={href} className="group flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3 sm:items-center">
                        <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-primary-200 bg-white px-2.5 text-[11px] font-extrabold text-primary-700">
                            <i className="ri-coupon-3-line text-sm" />
                            무료배송 쿠폰
                        </span>
                        <div className="min-w-0">
                            <p className="break-keep text-xs font-extrabold text-foreground-900">
                                오픈 3주 동안 회원가입 시 첫 구매 무료배송 쿠폰 지급
                            </p>
                            <p className="mt-0.5 break-keep text-[11px] font-semibold text-foreground-500">
                                가입 고객 1,000P 지급 · 4주 연속 구독 유지 시 무료배송 쿠폰 · 3만원 이상 항상 무료배송
                            </p>
                        </div>
                    </div>
                    <span className="inline-flex w-fit items-center gap-1 text-xs font-extrabold text-primary-700 transition-colors group-hover:text-primary-900">
                        {ctaLabel}
                        <i className="ri-arrow-right-line transition-transform group-hover:translate-x-0.5" />
                    </span>
                </Link>
            </div>
        </div>
    );
}

export function LaunchCouponCard({ ctaHref, ctaLabel }: CouponCardProps) {
    return (
        <div className="relative overflow-hidden rounded-lg border border-primary-100 bg-white shadow-sm">
            <div className="grid grid-cols-[1fr_96px]">
                <div className="p-5">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-50 px-2.5 py-1 text-[11px] font-extrabold text-primary-700">
                        <i className="ri-time-line text-sm" />
                        오픈 3주 한정
                    </span>
                    <h2 className="mt-3 break-keep text-xl font-black leading-tight text-foreground-950">첫 구매 무료배송 쿠폰</h2>
                    <p className="mt-2 break-keep text-xs leading-5 text-foreground-500">
                        오픈 기간에 회원가입하면 1,000P와 함께 첫 주문 배송비 0원 쿠폰이 지급돼요.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-md bg-background-100 px-2.5 py-1 text-[11px] font-bold text-foreground-600">첫 구매 전용</span>
                        <span className="rounded-md bg-background-100 px-2.5 py-1 text-[11px] font-bold text-foreground-600">1인 1회</span>
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 break-keep text-[11px] font-bold text-primary-700">
                        <i className="ri-loop-left-line text-sm" />
                        4주 연속 구독 유지 시 무료배송 쿠폰 추가 발급
                    </p>
                    {ctaHref && ctaLabel && (
                        <Link
                            href={ctaHref}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary-500 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-primary-600"
                        >
                            {ctaLabel}
                            <i className="ri-arrow-right-line" />
                        </Link>
                    )}
                </div>
                <div className="relative flex flex-col items-center justify-center border-l border-dashed border-primary-200 bg-primary-500 px-3 text-center text-white">
                    <span className="text-[11px] font-bold text-white/75">배송비</span>
                    <strong className="mt-1 text-2xl font-black leading-none">0원</strong>
                    <span className="mt-2 text-[10px] font-bold text-white/75">FREE</span>
                </div>
            </div>
        </div>
    );
}
