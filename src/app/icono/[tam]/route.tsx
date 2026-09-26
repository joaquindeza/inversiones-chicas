import { iconoApp } from "@/lib/icono";

export const dynamic = "force-static";
export function generateStaticParams() {
  return [{ tam: "192" }, { tam: "512" }];
}

export async function GET(_req: Request, { params }: RouteContext<"/icono/[tam]">) {
  const tam = (await params).tam === "512" ? 512 : 192;
  return iconoApp(tam);
}
