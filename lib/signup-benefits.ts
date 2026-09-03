export type SignupBenefitToastMode = "expected" | "check";

export const SIGNUP_BENEFIT_TOAST_MESSAGE = "가입 축하 1,000P와 첫 구매 무료배송 쿠폰이 지급되었습니다.";

const PENDING_KEY = "ounce.signup-benefit-toast.pending.v1";
const SEEN_PREFIX = "ounce.signup-benefit-toast.seen.v1:";
const seenSignupBenefitToasts = new Set<string>();

function clearLegacySignupBenefitToastSeen() {
    try {
        for (let index = localStorage.length - 1; index >= 0; index -= 1) {
            const key = localStorage.key(index);
            if (key?.startsWith(SEEN_PREFIX)) localStorage.removeItem(key);
        }
    } catch {
        // 이전 로컬 저장값 정리는 실패해도 화면 동작을 막지 않는다.
    }
}

export function markSignupBenefitToastPending(mode: SignupBenefitToastMode = "expected") {
    try {
        sessionStorage.setItem(PENDING_KEY, mode);
    } catch {
        // 브라우저 저장소를 쓸 수 없는 환경에서는 토스트만 건너뛴다.
    }
}

export function readSignupBenefitToastMode(): SignupBenefitToastMode | null {
    clearLegacySignupBenefitToastSeen();

    try {
        const value = sessionStorage.getItem(PENDING_KEY);
        return value === "expected" || value === "check" ? value : null;
    } catch {
        return null;
    }
}

export function clearSignupBenefitToastPending() {
    try {
        sessionStorage.removeItem(PENDING_KEY);
    } catch {
        // 저장소 접근 실패는 화면 동작을 막지 않는다.
    }
}

export function hasSeenSignupBenefitToast(memberKey: string) {
    return seenSignupBenefitToasts.has(memberKey);
}

export function markSignupBenefitToastSeen(memberKey: string) {
    seenSignupBenefitToasts.add(memberKey);
}
