"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";

type ToastType = "success" | "error";
type ConfirmKind = "delete" | "login" | "default";

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}

interface ConfirmState {
    message: string;
    description?: string;
    kind: ConfirmKind;
    resolve: (confirmed: boolean) => void;
}

interface ConfirmHandle {
    promise: Promise<boolean>;
    resolve: (confirmed: boolean) => void;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
    confirm: (message: string, options?: { description?: string; kind?: ConfirmKind }) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const toastKeysRef = useRef<Map<string, number>>(new Map());
    const confirmHandleRef = useRef<ConfirmHandle | null>(null);

    const toast = useCallback((message: string, type: ToastType = "success") => {
        const key = `${type}:${message}`;
        if (toastKeysRef.current.has(key)) return;

        const id = Date.now() + Math.random();
        toastKeysRef.current.set(key, id);
        setToasts((items) => [...items, { id, message, type }]);
        window.setTimeout(() => {
            setToasts((items) => items.filter((item) => item.id !== id));
            if (toastKeysRef.current.get(key) === id) {
                toastKeysRef.current.delete(key);
            }
        }, 2900);
    }, []);

    const confirm = useCallback<ToastContextValue["confirm"]>((message, options) => {
        if (confirmHandleRef.current) return confirmHandleRef.current.promise;

        let resolveConfirm: (confirmed: boolean) => void = () => {};
        const promise = new Promise<boolean>((resolve) => {
            resolveConfirm = resolve;
        });
        confirmHandleRef.current = { promise, resolve: resolveConfirm };
        setConfirmState({
            message,
            description: options?.description,
            kind: options?.kind ?? "default",
            resolve: resolveConfirm,
        });
        return promise;
    }, []);

    const closeConfirm = (confirmed: boolean) => {
        const handle = confirmHandleRef.current;
        confirmHandleRef.current = null;
        setConfirmState(null);
        handle?.resolve(confirmed);
    };

    const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

    return (
        <ToastContext.Provider value={value}>
            {children}

            <div className="fixed top-24 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center gap-2 px-4">
                {toasts.map((item) => (
                    <div
                        key={item.id}
                        className={`flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg ${
                            item.type === "error" ? "bg-red-600" : "bg-secondary-600"
                        }`}
                    >
                        <i className={`${item.type === "error" ? "ri-error-warning-line" : "ri-check-line"} text-lg`} />
                        <span>{item.message}</span>
                    </div>
                ))}
            </div>

            {confirmState && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mt-2 mb-6 flex flex-col items-center text-center">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                                <i
                                    className={`text-2xl ${
                                        confirmState.kind === "login"
                                            ? "ri-login-box-line"
                                            : confirmState.kind === "delete"
                                              ? "ri-delete-bin-line"
                                              : "ri-question-line"
                                    }`}
                                />
                            </div>
                            <p className="break-keep text-lg font-bold text-gray-900">{confirmState.message}</p>
                            <p className="mt-2 text-sm text-gray-500">
                                {confirmState.description ??
                                    (confirmState.kind === "delete"
                                        ? "삭제된 데이터는 복구할 수 없습니다."
                                        : "계속 진행하려면 확인을 눌러주세요.")}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => closeConfirm(false)}
                                className="flex-1 rounded-xl border border-gray-200 py-3.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={() => closeConfirm(true)}
                                className="flex-1 rounded-xl bg-primary-500 py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast 는 ToastProvider 안에서만 쓸 수 있습니다.");
    return context;
}
