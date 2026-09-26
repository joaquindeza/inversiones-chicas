import { Titulo } from "@/components/ui";
import { categorias, plataformas, tickers } from "@/lib/datos";
import { CatalogoTickers } from "./catalogo";

export default async function Tickers() {
  const [tks, cats, plats] = await Promise.all([tickers(), categorias(), plataformas()]);
  return (
    <>
      <Titulo sub="Los precios de IOL se actualizan con el sync; lo de otras plataformas (cripto, etc.) se carga a mano. Bonos y ONs suelen cotizar cada 100 nominales.">
        Tickers
      </Titulo>
      <CatalogoTickers
        tickers={tks}
        categorias={cats.map((c) => ({ id: c.id, nombre: c.nombre, color: c.color }))}
        plataformas={plats}
      />
    </>
  );
}
