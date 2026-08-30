import Link from "next/link";
import Footer from "./Footer";

export default function NotFoundView({ admin = false }: { admin?: boolean }) {
    const heroHeight = admin ? "min-h-[calc(100vh-2.5rem)]" : "min-h-[calc(100vh-6rem)] md:min-h-[calc(100vh-7rem)]";

    return (
        <div className="flex min-h-screen flex-col bg-background-cream text-foreground-950">
            <main className={`relative flex-1 overflow-hidden ${admin ? "pt-10" : "pt-24 md:pt-28"}`}>
                <div className="border-b border-background-200 bg-[#f7f3ec]">
                    <section
                        className={`mx-auto grid ${heroHeight} w-full max-w-7xl items-center gap-10 px-6 py-20 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-24 lg:px-12`}
                    >
                        <div className="max-w-xl">
                            <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1.5 text-xs font-bold text-primary-700 shadow-sm">
                                <i className="ri-compass-3-line text-sm" />
                                404
                            </span>
                            <h1 className="mt-5 break-keep text-4xl font-black leading-tight text-foreground-950 md:text-5xl">
                                요청하신 페이지를 찾을 수 없습니다
                            </h1>
                            <p className="mt-5 break-keep text-base leading-7 text-foreground-600">
                                주소가 잘못 입력되었거나 접근할 수 없는 페이지입니다. 홈으로 돌아가거나 상품 목록에서 다시 시작해주세요.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    href="/"
                                    className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-600"
                                >
                                    <i className="ri-home-4-line text-base" />
                                    홈으로 이동
                                </Link>
                                <Link
                                    href="/products"
                                    className="inline-flex items-center gap-2 rounded-lg border border-background-300 bg-white px-5 py-3 text-sm font-bold text-foreground-700 transition-colors hover:border-primary-300 hover:text-primary-700"
                                >
                                    <i className="ri-shopping-bag-3-line text-base" />
                                    상품 보러가기
                                </Link>
                                <Link
                                    href="/support"
                                    className="inline-flex items-center gap-2 rounded-lg border border-background-300 bg-white px-5 py-3 text-sm font-bold text-foreground-700 transition-colors hover:border-deal-300 hover:text-deal-700"
                                >
                                    <i className="ri-customer-service-2-line text-base" />
                                    고객센터
                                </Link>
                            </div>
                        </div>

                        <div className="relative mx-auto hidden h-[390px] w-full max-w-[520px] md:block">
                            <div className="absolute left-4 top-8 h-56 w-44 overflow-hidden rounded-lg border border-white bg-white shadow-xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/img/8.jpg" alt="" className="h-full w-full object-cover" />
                            </div>
                            <div className="absolute right-6 top-0 h-64 w-52 overflow-hidden rounded-lg border border-white bg-white shadow-xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/img/14.jpg" alt="" className="h-full w-full object-cover" />
                            </div>
                            <div className="absolute bottom-4 left-28 h-48 w-56 overflow-hidden rounded-lg border border-white bg-white shadow-xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/img/20.jpg" alt="" className="h-full w-full object-cover" />
                            </div>
                            <div className="absolute bottom-14 right-0 rounded-lg border border-background-200 bg-white px-5 py-4 shadow-lg">
                                <p className="text-xs font-bold uppercase tracking-wide text-primary-600">Ounce</p>
                                <p className="mt-1 text-sm font-bold text-foreground-900">딱 맞는 1인분 밀키트</p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
