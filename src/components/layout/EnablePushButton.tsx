"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Bell, BellOff } from "lucide-react"
import { subscribePushAction, unsubscribePushAction } from "@/lib/actions/push"

// VAPID public key is base64url; PushManager wants a Uint8Array.
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function EnablePushButton() {
  const { toast } = useToast();
  const [supported, setSupported] = React.useState(false);
  const [enabled, setEnabled] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    if (ok) {
      navigator.serviceWorker.getRegistration().then((reg) =>
        reg?.pushManager.getSubscription().then((s) => setEnabled(!!s)),
      ).catch(() => {});
    }
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("Push not configured");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { toast({ variant: "destructive", title: "Notifications blocked" }); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await subscribePushAction({ endpoint: json.endpoint, keys: json.keys });
      setEnabled(true);
      toast({ title: "Push notifications enabled" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not enable push", description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setEnabled(false);
      toast({ title: "Push notifications turned off" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not turn off push", description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <Button variant="ghost" size="icon" onClick={enabled ? disable : enable} disabled={busy}
      title={enabled ? "Push on — click to turn off" : "Enable push notifications"}>
      {enabled ? <Bell className="h-5 w-5 text-emerald-500" /> : <BellOff className="h-5 w-5" />}
      <span className="sr-only">{enabled ? "Disable push" : "Enable push"}</span>
    </Button>
  );
}
