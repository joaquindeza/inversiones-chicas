"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/mi", texto: "Mi cartera", icono: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" },
  { href: "/mi/inversiones", texto: "Invertida en", icono: "M12 3a9 9 0 1 0 9 9h-9z M14 1.5V10h8.5A8.5 8.5 0 0 0 14 1.5" },
  { href: "/mi/crecimiento", texto: "Creciendo", icono: "M3 17l6-6 4 4 8-8 M15 7h6v6" },
  { href: "/mi/futuro", texto: "Mi futuro", icono: "M12 2l2.9 6.9L22 9.3l-5.5 4.8L18.2 21 12 17.3 5.8 21l1.7-6.9L2 9.3l7.1-.4z" },
  { href: "/mi/aprender", texto: "Aprender", icono: "M2 7l10-4 10 4-10 4z M6 9v6c0 1.7 2.7 3 6 3s6-1.3 6-3V9" },
];

export function NavMi() {
  const ruta = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-borde pb-[env(safe-area-inset-bottom)]">
      <ul className="flex max-w-xl mx-auto">
        {TABS.map((t) => {
          const activo = t.href === "/mi" ? ruta === "/mi" : ruta.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link href={t.href} aria-current={activo ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${activo ? "font-bold" : "text-tenue"}`}
                style={activo ? { color: "var(--color-h)" } : undefined}>
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={activo ? 2.2 : 1.8} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
                  <path d={t.icono} />
                </svg>
                {t.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
