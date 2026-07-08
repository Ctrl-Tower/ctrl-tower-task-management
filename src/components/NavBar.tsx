"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { AccountModal } from "@/components/AccountModal";
import { ImportModal } from "@/components/import/ImportModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BoardControls } from "@/components/board/board-prefs";
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
  const [importOpen, setImportOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-100">Task Board</span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {pathname === "/" && <BoardControls />}
        <button onClick={() => setImportOpen(true)} className="btn-ghost border border-neutral-700 text-xs">
          Import notes
        </button>
        <button
          onClick={() => setAccountOpen(true)}
          className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-neutral-800"
          title="Account & password"
        >
          <Avatar user={user} size={28} />
          <span className="hidden text-sm text-neutral-300 sm:block">{user.name}</span>
        </button>
        <button onClick={logout} className="btn-ghost text-xs">
          Sign out
        </button>
      </div>

      {accountOpen && <AccountModal user={user} onClose={() => setAccountOpen(false)} />}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
    </header>
  );
}
