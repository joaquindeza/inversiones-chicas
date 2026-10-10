import { Seccion, Titulo } from "@/components/ui";
import { CredencialesIOL, PanelSync, SelectorFrecuencia } from "@/components/sync";
import { credencialesIol, frecuenciaSync, hermanas, ultimoSync } from "@/lib/datos";
import { FormClaves } from "./forms";

export default async function Configuracion() {
  const [hs, creds, frecuencia, sync] = await Promise.all([
    hermanas(), credencialesIol(), frecuenciaSync(), ultimoSync(),
  ]);
  const cred = new Map(creds.map((c) => [c.hermana_id, c]));
  return (
    <>
      <Titulo sub={<>Sincronización con IOL, objetivos de cartera y accesos. · <a href="/admin/tickers" className="text-marino underline">Catálogo de tickers</a></>}>Configuración</Titulo>
      <div className="grid lg:grid-cols-2 gap-4">
        <Seccion titulo="Sincronización con IOL" className="lg:col-span-2">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold mb-2">Sincronización automática</p>
                <SelectorFrecuencia actual={frecuencia} />
              </div>
              <PanelSync ultimo={sync} frecuencia={frecuencia} conDetalle />
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">Credenciales de IOL</p>
              <p className="text-xs text-tenue mb-3">
                Se guardan cifradas en Supabase Vault y solo las usa el sync (que es de solo lectura: nunca compra, vende ni
                transfiere). Desde acá se pueden cargar o cambiar, pero nunca se pueden ver.
              </p>
              <CredencialesIOL lista={hs.map((h) => ({
                hermana_id: h.id, nombre: h.nombre, color: h.color,
                usuario_mascara: cred.get(h.id)?.usuario_mascara ?? null,
                cargada_el: cred.get(h.id)?.cargada_el ?? null,
                ultimo_login_ok: cred.get(h.id)?.ultimo_login_ok ?? null,
              }))} />
            </div>
          </div>
        </Seccion>
        <Seccion titulo="Objetivos de cartera">
          <p className="text-sm text-tenue">
            Los objetivos ahora son la <b>cartera ideal</b> de cada una (por categoría y por ticker, con versiones por fecha):
            se arman en <a href="/admin/planificacion?tab=ideal" className="text-marino underline">Planificación → Cartera ideal</a>.
            Las alertas de desvío comparan contra la ideal vigente.
          </p>
        </Seccion>
        <Seccion titulo="Accesos">
          <p className="text-sm text-tenue mb-3">
            Las chicas entran eligiendo su perfil y un PIN de 6 números. Vos, con tu clave. Acá se cambian; nunca se pueden ver.
          </p>
          <FormClaves perfiles={[...hs.map((h) => ({ clave: String(h.id), nombre: h.nombre })), { clave: "admin", nombre: "Joaquín (vos)" }]} />
        </Seccion>

      </div>
    </>
  );
}
