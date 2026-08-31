"use client";

import { useRouter } from "next/navigation";
import { stopImpersonationAction } from "@/lib/actions/platform";

export function ExitImpersonationButton() {
  const router = useRouter();
  async function exit() {
    await stopImpersonationAction();
    router.push("/admin");
    router.refresh();
  }
  return (
    <button onClick={exit} className="rounded-md bg-black/20 px-2.5 py-1 text-xs font-semibold hover:bg-black/30">
      Exit
    </button>
  );
}
