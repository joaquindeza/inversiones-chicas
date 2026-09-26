// Piezas de interfaz compartidas (sin estado, sirven en servidor).

export function Titulo({ children, sub, color }: { children: React.ReactNode; sub?: React.ReactNode; color?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-black" style={{ color: color ?? "var(--color-marino)" }}>{children}</h1>
      {sub && <p className="text-sm text-tenue mt-1">{sub}</p>}
    </div>
  );
}

export function Tarjeta({ titulo, children, sub, className = "" }: {
  titulo: React.ReactNode; children: React.ReactNode; sub?: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl bg-white border border-borde px-4 py-3 ${className}`}>
      <p className="text-xs text-tenue">{titulo}</p>
      <div className="text-xl font-bold mt-1">{children}</div>
      {sub && <div className="text-xs text-tenue mt-1">{sub}</div>}
    </div>
  );
}

export function Seccion({ titulo, children, accion, className = "" }: {
  titulo: string; children: React.ReactNode; accion?: React.ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-xl bg-white border border-borde p-4 md:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-bold text-marino">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-tenue py-6 text-center">{children}</p>;
}

export const th = "text-left text-xs font-semibold text-tenue px-2 py-2 border-b border-borde whitespace-nowrap";
export const td = "px-2 py-1.5 border-b border-borde/60 whitespace-nowrap";
