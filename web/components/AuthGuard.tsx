"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api.auth
      .me()
      .then(() => setChecked(true))
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!checked) return <div className="p-6 text-sm text-ink-light">Checking session…</div>;
  return <>{children}</>;
}
