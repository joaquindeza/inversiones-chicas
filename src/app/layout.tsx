import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import { cookies } from "next/headers";
import { PreferenciasProvider } from "@/components/preferencias";
import { leerPreferencias } from "@/lib/preferencias";
import "./globals.css";

const lato = Lato({ variable: "--font-lato", subsets: ["latin"], weight: ["400", "700", "900"] });

export const metadata: Metadata = {
  title: "Inversiones Chicas",
  description: "Las carteras de Amparo, Rosario y Clara, en dólares.",
};

export const viewport: Viewport = { themeColor: "#0B2545" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Las preferencias (ocultar montos, USD/ARS) viajan en una cookie para que el servidor
  // renderice igual que el cliente, sin parpadeo.
  const prefs = leerPreferencias((await cookies()).get("prefs")?.value);
  return (
    <html lang="es-AR" className={`${lato.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <PreferenciasProvider inicial={prefs}>{children}</PreferenciasProvider>
      </body>
    </html>
  );
}
