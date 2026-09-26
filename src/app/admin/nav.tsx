"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav({ links }: { links: { href: string; texto: string; color?: string }[] }) {
  const ruta = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {links.map((l) => {
        const activo = l.href === "/admin" ? ruta === "/admin" : ruta.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${activo ? "bg-white/15 font-bold" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
          >
            {l.color && <span className="size-2.5 rounded-full" style={{ background: l.color }} />}
            {l.texto}
          </Link>
        );
      })}
    </nav>
  );
}
