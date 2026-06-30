"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { AccountModal } from "@/components/AccountModal";
import type { UserDTO } from "@/lib/types";

const LINKS = [
  { href: "/", label: "Board" },
  { href: "/archive", label: "Archive" },
  { href: "/team", label: "Team" },
  { href: "/settings", label: "Settings" },
];

export function NavBar({ user }: { user: UserDTO }) {
  const pathname = usePathname();
  const router = useRouter();
  const [accountOpen, setAccountOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-700 text-xs font-bold text-slate-100">
            CT
          </span>
          <span className="text-sm font-semibold text-slate-100">Task Board</span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setAccountOpen(true)}
          className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-slate-800"
          title="Account & password"
        >
          <Avatar user={user} size={28} />
          <span className="hidden text-sm text-slate-300 sm:block">{user.name}</span>
        </button>
        <button onClick={logout} className="btn-ghost text-xs">
          Sign out
        </button>
      </div>

      {accountOpen && <AccountModal user={user} onClose={() => setAccountOpen(false)} />}
    </header>
  );
}
