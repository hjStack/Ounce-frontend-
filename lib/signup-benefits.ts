export type SignupBenefitToastMode =
  | "expected"
  | "check"
  | "oauth-login"
  | "oauth-signup";

export interface SignupBenefitToastPending {
  mode: SignupBenefitToastMode;
  startedAt: number;
}

interface SignupBenefitMemberSnapshot {
  memberId?: number | null;
  email?: string | null;
  createdAt?: string | null;
  createdDate?: string | null;
  created_at?: string | null;
  joinedAt?: string | null;
}

interface SignupBenefitWithdrawalSnapshot {
  email: string;
  happenedAt: number;
}

export const SIGNUP_BENEFIT_TOAST_MESSAGE =
  "가입 축하 1,000P와 첫 구매 무료배송 쿠폰이 지급되었습니다.";
export const SIGNUP_POINT_TOAST_MESSAGE =
  "가입 축하 포인트 1,000P가 지급되었어요";
export const GOOGLE_SIGNUP_POINT_TOAST_MESSAGE = SIGNUP_POINT_TOAST_MESSAGE;
export const GOOGLE_LOGIN_SUCCESS_TOAST_MESSAGE =
  "오늘도 맛있는 하루! Ounce와 함께 열어볼까요?";

const PENDING_KEY = "ounce.signup-benefit-toast.pending.v1";
const WITHDRAWAL_KEY = "ounce.signup-benefit-toast.withdrawal.v1";
const WITHDRAWAL_WINDOW_MS = 24 * 60 * 60 * 1000;
const LEGACY_SEEN_PREFIXES = [
  "ounce.signup-benefit-toast.seen.v1:",
  "ounce.signup-benefit-toast.seen.v2:",
];
const SEEN_PREFIX = "ounce.signup-benefit-toast.seen.v3:";
const seenSignupBenefitToasts = new Set<string>();
let legacySignupBenefitToastSeenCleared = false;

function clearLegacySignupBenefitToastSeen() {
  if (legacySignupBenefitToastSeenCleared) return;
  legacySignupBenefitToastSeenCleared = true;

  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (
        key &&
        LEGACY_SEEN_PREFIXES.some((prefix) => key.startsWith(prefix))
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // 이전 로컬 저장값 정리는 실패해도 화면 동작을 막지 않는다.
  }
}

function normalizeMode(value: unknown): SignupBenefitToastMode | null {
  return value === "expected" ||
    value === "check" ||
    value === "oauth-login" ||
    value === "oauth-signup"
    ? value
    : null;
}

function storageKey(memberKey: string) {
  return `${SEEN_PREFIX}${memberKey}`;
}

function normalizedEmail(user: SignupBenefitMemberSnapshot) {
  return user.email?.trim().toLowerCase() || "";
}

function memberJoinedAt(user: SignupBenefitMemberSnapshot) {
  return (
    user.createdAt ||
    user.createdDate ||
    user.created_at ||
    user.joinedAt ||
    ""
  ).trim();
}

export function signupBenefitMemberKey(user: SignupBenefitMemberSnapshot) {
  const memberId = Number(user.memberId);
  if (Number.isInteger(memberId) && memberId > 0) return `id:${memberId}`;

  const email = normalizedEmail(user);
  const joinedAt = memberJoinedAt(user);
  if (email && joinedAt) return `email:${email}:joined:${joinedAt}`;
  if (email) return `email:${email}`;

  return "unknown";
}

export function markSignupBenefitToastPending(
  mode: SignupBenefitToastMode = "expected",
) {
  try {
    sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ mode, startedAt: Date.now() }),
    );
  } catch {
    // 브라우저 저장소를 쓸 수 없는 환경에서는 토스트만 건너뛴다.
  }
}

export function readSignupBenefitToastPending(): SignupBenefitToastPending | null {
  clearLegacySignupBenefitToastSeen();

  try {
    const value = sessionStorage.getItem(PENDING_KEY);
    if (!value) return null;

    const legacyMode = normalizeMode(value);
    if (legacyMode) return { mode: legacyMode, startedAt: Date.now() };

    const parsed = JSON.parse(value) as {
      mode?: unknown;
      startedAt?: unknown;
    };
    const mode = normalizeMode(parsed.mode);
    if (!mode) return null;

    return {
      mode,
      startedAt:
        typeof parsed.startedAt === "number" &&
        Number.isFinite(parsed.startedAt)
          ? parsed.startedAt
          : Date.now(),
    };
  } catch {
    return null;
  }
}

export function readSignupBenefitToastMode(): SignupBenefitToastMode | null {
  return readSignupBenefitToastPending()?.mode ?? null;
}

export function clearSignupBenefitToastPending() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // 저장소 접근 실패는 화면 동작을 막지 않는다.
  }
}

export function hasSeenSignupBenefitToast(memberKey: string) {
  clearLegacySignupBenefitToastSeen();
  if (seenSignupBenefitToasts.has(memberKey)) return true;

  try {
    return sessionStorage.getItem(storageKey(memberKey)) === "1";
  } catch {
    return false;
  }
}

export function markSignupBenefitToastSeen(memberKey: string) {
  seenSignupBenefitToasts.add(memberKey);

  try {
    sessionStorage.setItem(storageKey(memberKey), "1");
  } catch {
    // 저장소 접근 실패 시 현재 세션에서만 중복 노출을 막는다.
  }
}

export function forgetSignupBenefitToastSeen(memberKey: string) {
  seenSignupBenefitToasts.delete(memberKey);

  try {
    sessionStorage.removeItem(storageKey(memberKey));
  } catch {
    // 저장소 접근 실패는 이후 로그인 흐름을 막지 않는다.
  }
}

export function markSignupBenefitWithdrawal(user: SignupBenefitMemberSnapshot) {
  const email = normalizedEmail(user);
  if (!email) return;

  try {
    sessionStorage.setItem(
      WITHDRAWAL_KEY,
      JSON.stringify({ email, happenedAt: Date.now() }),
    );
  } catch {
    // 저장소 접근 실패는 탈퇴 동작 자체를 막지 않는다.
  }
}

export function hasRecentSignupBenefitWithdrawal(
  user: SignupBenefitMemberSnapshot,
) {
  const email = normalizedEmail(user);
  if (!email) return false;

  try {
    const value = sessionStorage.getItem(WITHDRAWAL_KEY);
    if (!value) return false;

    const parsed = JSON.parse(
      value,
    ) as Partial<SignupBenefitWithdrawalSnapshot>;
    const happenedAt =
      typeof parsed.happenedAt === "number" &&
      Number.isFinite(parsed.happenedAt)
        ? parsed.happenedAt
        : 0;

    if (Date.now() - happenedAt > WITHDRAWAL_WINDOW_MS) {
      sessionStorage.removeItem(WITHDRAWAL_KEY);
      return false;
    }

    return parsed.email === email;
  } catch {
    return false;
  }
}

export function clearSignupBenefitWithdrawal() {
  try {
    sessionStorage.removeItem(WITHDRAWAL_KEY);
  } catch {
    // 저장소 접근 실패는 화면 동작을 막지 않는다.
  }
}
