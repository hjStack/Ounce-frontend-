import { apiFetch } from "@/lib/api";

type PushSubscriptionPayload = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function uint8ArrayToBase64Url(value: ArrayBuffer) {
  const bytes = new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export async function subscribeToMidnightPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("PUSH_UNSUPPORTED");
  }

  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;


  console.log(
    "VAPID public key loaded:",
    Boolean(publicKey),
    publicKey?.slice(0, 4)
  );

  if (!publicKey) throw new Error("PUSH_PUBLIC_KEY_MISSING");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("PUSH_PERMISSION_DENIED");

  const registration = await navigator.serviceWorker.register("/sw.js");
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(publicKey),
    });
  }

  const key = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");
  if (!key || !auth) throw new Error("PUSH_KEYS_MISSING");

  const payload: PushSubscriptionPayload = {
    endpoint: subscription.endpoint,
    p256dh: uint8ArrayToBase64Url(key),
    auth: uint8ArrayToBase64Url(auth),
  };

  const response = await apiFetch("/api/notifications/push-subscriptions", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("PUSH_SUBSCRIPTION_SAVE_FAILED");
}

export async function removeMidnightPush() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await apiFetch("/api/notifications/push-subscriptions", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}
