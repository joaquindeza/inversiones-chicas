import { ImageResponse } from "next/og";

/** Ícono de la app: una "semilla que crece" (tres barras en los colores de las chicas) sobre azul marino. */
export function iconoApp(tam: number) {
  const b = Math.round(tam * 0.12);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0B2545", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: b * 0.6, paddingBottom: tam * 0.2 }}>
        <div style={{ width: b, height: tam * 0.28, background: "#D96C48", borderRadius: b / 3 }} />
        <div style={{ width: b, height: tam * 0.42, background: "#2A9D8F", borderRadius: b / 3 }} />
        <div style={{ width: b, height: tam * 0.58, background: "#6A4C93", borderRadius: b / 3 }} />
      </div>
    ),
    { width: tam, height: tam },
  );
}
