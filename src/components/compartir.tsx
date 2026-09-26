"use client";

import { useState } from "react";

/** Comparte la imagen del reporte del mes (WhatsApp, etc.); si el navegador no puede, la descarga. */
export function BotonCompartir({ url, nombre, className = "", style }: { url: string; nombre: string; className?: string; style?: React.CSSProperties }) {
  const [estado, setEstado] = useState<"" | "cargando" | "error">("");
  const compartir = async () => {
    setEstado("cargando");
    try {
      const blob = await (await fetch(url)).blob();
      const archivo = new File([blob], `${nombre}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: nombre });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${nombre}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      setEstado("");
    } catch (e) {
      setEstado((e as Error).name === "AbortError" ? "" : "error");
    }
  };
  return (
    <button onClick={compartir} disabled={estado === "cargando"} className={className} style={style}>
      {estado === "cargando" ? "Armando la imagen…" : estado === "error" ? "No se pudo, probá de nuevo" : "Compartir mi mes 📤"}
    </button>
  );
}
