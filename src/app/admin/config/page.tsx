import { Seccion, Titulo } from "@/components/ui";
import { categorias, hermanas } from "@/lib/datos";
import { FormClaves, FormObjetivos } from "./forms";

export default async function Configuracion() {
  const [cats, hs] = await Promise.all([categorias(), hermanas()]);
  return (
    <>
      <Titulo sub="Objetivos de cartera, accesos y (en la etapa 4) la sincronización con IOL.">Configuración</Titulo>
      <div className="grid lg:grid-cols-2 gap-4">
        <Seccion titulo="Objetivo por categoría">
          <p className="text-sm text-tenue mb-3">Perfil agresivo: ~15% en Bonos/ONs y el resto renta variable. Los vacíos no se comparan.</p>
          <FormObjetivos categorias={cats.map((c) => ({ id: c.id, nombre: c.nombre, color: c.color, objetivo: c.objetivo_pct }))} />
        </Seccion>
        <Seccion titulo="Accesos">
          <p className="text-sm text-tenue mb-3">
            Las chicas entran eligiendo su perfil y un PIN de 6 números. Vos, con tu clave. Acá se cambian; nunca se pueden ver.
          </p>
          <FormClaves perfiles={[...hs.map((h) => ({ clave: String(h.id), nombre: h.nombre })), { clave: "admin", nombre: "Joaquín (vos)" }]} />
        </Seccion>
        <Seccion titulo="Sincronización con IOL" className="lg:col-span-2">
          <p className="text-sm text-tenue">
            Llega en la etapa 4: credenciales de IOL (se cargan acá y quedan cifradas en Supabase Vault; nunca se pueden leer de
            vuelta), interruptor apagado / cada 6 horas / diaria, y el botón “Sincronizar ahora”.
          </p>
        </Seccion>
      </div>
    </>
  );
}
