import Link from "next/link";

type CouponCardProps = {
    ctaHref?: string;
    ctaLabel?: string;
};

export function LaunchCouponStrip() {
    return (
        <div className="border-b border-primary-100 bg-primary-50">
            <div className="mx-auto w-full max-w-7xl px-4 py-3 md:px-8 lg:px-12">
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                    <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-primary-200 bg-white px-2.5 text-[11px] font-extrabold text-primary-700">
                        <i className="ri-truck-line text-sm" />
                        구독 배송비 0원
                    </span>
                    <div className="min-w-0">
                        {/* <p className="break-keep text-xs font-extrabold text-foreground-900">
                            구독하면 끼 수와 관계없이 매주 무료배송
                        </p> */}
                        <p className="mt-0.5 break-keep text-[11px] font-semibold text-foreground-500">
                        {/* [새벽배송 안내] 현재 서울 지역 한정 서비스 중이며, 추후 수도권 및 타 지역으로 점차 확대될 예정입니다. */}
                        오픈 준비중입니다 
                        </p>
                    </div>
                </div>
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
                        <i className="ri-truck-line text-sm" />
                        구독 혜택
                    </span>
                    <h2 className="mt-3 break-keep text-xl font-black leading-tight text-foreground-950">구독 배송비 0원</h2>
                    <p className="mt-2 break-keep text-xs leading-5 text-foreground-500">
                        구독은 끼 수와 관계없이 매주 배송비가 없습니다.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-md bg-background-100 px-2.5 py-1 text-[11px] font-bold text-foreground-600">매주 무료배송</span>
                        <span className="rounded-md bg-background-100 px-2.5 py-1 text-[11px] font-bold text-foreground-600">서울 새벽배송</span>
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 break-keep text-[11px] font-bold text-primary-700">
                        <i className="ri-coupon-3-line text-sm" />
                        결제가 4회 이어질 때마다 3,000원 할인 쿠폰 지급
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
