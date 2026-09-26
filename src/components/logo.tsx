import logos from "@/lib/logos.json";

// Logos que son blancos: van sobre un círculo oscuro para que se vean.
const FONDO_OSCURO = new Set(["AMZN.png", "DIS.png", "HIMS.png", "NKE.png", "NOW.png", "QQQ.png", "UBER.png", "V.png"]);
// Logos que son un cuadrado de color lleno: ocupan todo el círculo.
const LLENAR = new Set(["YPF.png"]);
const MAPA = logos as Record<string, string>;

/**
 * Logo circular de un ticker (public/logos, lo baja `npm run logos`). Si no hay logo, muestra las
 * iniciales sobre el color de su categoría.
 */
export function Logo({ ticker, color = "#9CA3AF", tam = 24 }: { ticker: string; color?: string | null; tam?: number }) {
  const archivo = MAPA[ticker];
  const estilo = { width: tam, height: tam, minWidth: tam };
  if (!archivo) {
    return (
      <span className="inline-grid place-items-center rounded-full text-white font-bold align-middle"
        style={{ ...estilo, background: color ?? "#9CA3AF", fontSize: tam * 0.36 }} aria-hidden>
        {ticker.replace(/[^A-Z0-9]/g, "").slice(0, 2)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- íconos chicos y estáticos, no hace falta next/image
    <img src={`/logos/${archivo}`} alt="" width={tam} height={tam} loading="lazy"
      className={`inline-block rounded-full align-middle border border-borde ${LLENAR.has(archivo) ? "object-cover" : "object-contain"} ${FONDO_OSCURO.has(archivo) ? "bg-tinta p-0.5" : "bg-white"}`}
      style={estilo} />
  );
}

/** Ticker con su logo a la izquierda. */
export function TickerConLogo({ ticker, color, nombre, tam = 24 }: { ticker: string; color?: string | null; nombre?: string | null; tam?: number }) {
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <Logo ticker={ticker} color={color} tam={tam} />
      <b>{ticker}</b>
      {nombre && <span className="text-tenue font-normal truncate">{nombre}</span>}
    </span>
  );
}
