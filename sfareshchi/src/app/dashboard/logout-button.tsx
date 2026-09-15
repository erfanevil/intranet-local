"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const logout = async () => {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={logout} disabled={pending}>
      <LogOut size={16} />
      {pending ? "…" : "خروج"}
    </button>
  );
}
