// Horario de BYMA y vigencia de los precios. Argentina es UTC-3 todo el año (sin horario de verano).
// No contempla feriados: un feriado se trata como día hábil (a lo sumo se pide el precio de más).

const ART = -3 * 3_600_000;
const APERTURA = 11 * 60, CIERRE = 17 * 60; // minutos del día, hora de Buenos Aires
const FRESCO_MS = 10 * 60_000; // con el mercado abierto, un precio vale 10 minutos

const enArt = (d: Date) => new Date(d.getTime() + ART); // leer con getUTC*
const habil = (dArt: Date) => dArt.getUTCDay() >= 1 && dArt.getUTCDay() <= 5;
const minutos = (dArt: Date) => dArt.getUTCHours() * 60 + dArt.getUTCMinutes();

export function mercadoAbierto(ahora = new Date()): boolean {
  const a = enArt(ahora);
  return habil(a) && minutos(a) >= APERTURA && minutos(a) < CIERRE;
}

/** Último cierre del mercado (17:00 de Buenos Aires de un día hábil) anterior a `ahora`. */
export function ultimoCierre(ahora = new Date()): Date {
  const a = enArt(ahora);
  const d = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate(), 17));
  if (d.getTime() > a.getTime()) d.setUTCDate(d.getUTCDate() - 1);
  while (!habil(d)) d.setUTCDate(d.getUTCDate() - 1);
  return new Date(d.getTime() - ART);
}

/** ¿Hay que volver a pedir el precio? Abierto: si tiene más de 10 minutos. Cerrado: si es de antes del último cierre. */
export function precioVencido(actualizado: string | null | undefined, ahora = new Date()): boolean {
  if (!actualizado) return true;
  const t = Date.parse(actualizado);
  if (Number.isNaN(t)) return true;
  if (mercadoAbierto(ahora)) return ahora.getTime() - t > FRESCO_MS;
  return t < ultimoCierre(ahora).getTime() + 5 * 60_000; // margen: IOL cierra unos segundos después de las 17
}

/** "en vivo 14:32" o "cierre vie 9/10" para mostrar al lado de un precio. */
export function etiquetaPrecio(precioFecha: string | null | undefined, actualizado: string | null | undefined, ahora = new Date()): string {
  const f = precioFecha ?? actualizado;
  if (!f) return "sin precio";
  const d = new Date(f);
  const dArt = enArt(d);
  const hora = `${String(dArt.getUTCHours()).padStart(2, "0")}:${String(dArt.getUTCMinutes()).padStart(2, "0")}`;
  const mismoDia = enArt(ahora).toISOString().slice(0, 10) === dArt.toISOString().slice(0, 10);
  if (mercadoAbierto(ahora) && mismoDia) return `en vivo ${hora}`;
  const dia = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][dArt.getUTCDay()];
  return minutos(dArt) >= CIERRE - 1 || !mismoDia
    ? `cierre ${dia} ${dArt.getUTCDate()}/${dArt.getUTCMonth() + 1}`
    : `${dia} ${hora}`;
}
