"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/invoices", label: "Invoices" },
  { href: "/customers", label: "Customers" },
  { href: "/items", label: "Items" },
  { href: "/reports", label: "Reports" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-paper-border bg-paper-card print:hidden">
      <div className="px-5 py-5 border-b border-paper-border">
        <span className="font-serif text-lg font-semibold tracking-tight text-ink">Billbook</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-ink text-white" : "text-ink-light hover:bg-paper hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-paper-border p-3">
        <button
          onClick={() => {
            clearToken();
            router.replace("/login");
          }}
          className="block w-full rounded px-3 py-2 text-left text-sm font-medium text-ink-light hover:bg-paper hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
