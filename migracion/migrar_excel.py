#!/usr/bin/env python3
"""
migrar_excel.py — Migración de una sola vez: "Inversiones Chicas v2.xlsm" → Supabase.

Lee el Excel con openpyxl en modo solo lectura (no lo modifica ni lo guarda) y genera SQL:

  salida/01_datos_excel.sql  Los datos tal cual están en el Excel, incluido su MEP. Sirve para
                             verificar que la app calcula igual que la planilla.
  salida/02_ajustes.sql      Correcciones posteriores a la verificación:
                             - el AAPL de Rosario y Amparo fue un regalo de IOL (cuenta de menores):
                               pasa a "Ingreso de títulos" y el aporte baja en ese monto;
                             - el MEP pasa a ser el de Ámbito (el mismo que usa finjoa).

La carpeta salida/ está en .gitignore: tiene datos personales.

Uso:  py migracion/migrar_excel.py
"""
import datetime
import os

import requests
from openpyxl import load_workbook

EXCEL = os.path.expanduser(
    r"~\OneDrive\Documentos\Claude\Projects\Inversiones Hermanas\Inversiones Chicas v2.xlsm")
SALIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida")

HERMANAS = [  # id, nombre, color, nacimiento, orden
    (1, "Amparo", "#D96C48", datetime.date(2010, 7, 30), 1),
    (2, "Rosario", "#2A9D8F", datetime.date(2008, 11, 19), 2),
    (3, "Clara", "#6A4C93", datetime.date(2007, 3, 19), 3),
]
ID = {n: i for i, n, *_ in HERMANAS}
CATEGORIA_ID = {"Bonos / ONs": 1, "CEDEARs": 2, "Cripto": 3, "Fondos USD": 4,
                "Acciones americanas": 5, "Acciones argentinas": 6, "Disponibilidades": 7}
REGALO_IOL = {"Amparo": 26680, "Rosario": 24860}   # AAPL regalado por IOL (ARS, valor al ingreso)
# Alcanza con el MEP desde un mes antes del primer movimiento (sept. 2026). El histórico completo
# de Ámbito lo carga el sync (Edge Function) la primera vez que corre.
MEP_DESDE = datetime.date(2026, 8, 1)


def q(v):
    """Valor Python → literal SQL."""
    if v is None or v == "":
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, datetime.datetime):   # el Excel guarda hora de Argentina, sin zona
        return f"'{v.isoformat(sep=' ', timespec='seconds')}{'' if v.tzinfo else '-03'}'"
    if isinstance(v, datetime.date):
        return f"'{v.isoformat()}'"
    if isinstance(v, (int, float)):
        return repr(round(v, 10)) if isinstance(v, float) else str(v)
    return "'" + str(v).replace("'", "''") + "'"


def fecha(v):
    return v.date() if isinstance(v, datetime.datetime) else v


def filas(ws, r0, ncol, r1=None):
    for row in ws.iter_rows(min_row=r0, max_row=r1 or ws.max_row, max_col=ncol, values_only=True):
        if row[0] not in (None, ""):
            yield row


def insert(tabla, cols, valores):
    if not valores:
        return ""
    cuerpo = ",\n".join("  (" + ", ".join(q(v) for v in fila) + ")" for fila in valores)
    return f"insert into public.{tabla} ({', '.join(cols)}) values\n{cuerpo};\n\n"


def datos_excel(wb):
    sql = ["-- Generado por migrar_excel.py a partir del Excel (solo lectura). No editar a mano.\n"
           "begin;\n\n"]
    sql.append(insert("hermanas", ["id", "nombre", "color", "fecha_nacimiento", "orden"], HERMANAS))

    # Tickers (A..J: ticker, nombre, categoría, plataforma, moneda, precio, cotiza cada, -, actualizado, fuente)
    tks = []
    for t, nom, cat, plat, mon, precio, cada, _, act, fuente in filas(wb["Tickers"], 5, 10):
        tks.append((str(t).strip().upper(), nom, CATEGORIA_ID.get(cat), plat or None, mon or "ARS",
                    precio, cada or 1, act, fuente))
    sql.append(insert("tickers", ["ticker", "nombre", "categoria_id", "plataforma", "moneda", "precio",
                                  "cotiza_cada", "actualizado", "fuente"], tks))

    # MEP del Excel (argentinadatos) y el MEP_ACTUAL que usaba
    mep = [(fecha(f), ref, c, v, "argentinadatos (Excel)") for f, c, v, ref in filas(wb["MEP"], 5, 4)
           if fecha(f) >= MEP_DESDE]
    sql.append(insert("mep", ["fecha", "referencia", "compra", "venta", "fuente"], mep))
    cfg = wb["Config"]
    sql.append(insert("mep_vivo", ["valor", "fecha", "fuente"],
                      [(cfg["C5"].value, fecha(cfg["C6"].value), "dolarapi (Excel)")]))

    # Movimientos (A..P)
    movs = []
    for (f, h, tipo, tk, cant, monto, mon, tcm, _, _, _, plat, apor, nota, orig, id_iol) in filas(
            wb["Movimientos"], 6, 16):
        movs.append((fecha(f), ID[h], tipo, str(tk).strip().upper() if tk else None, cant, monto, mon or "ARS",
                     tcm, plat or "IOL", apor, nota, "IOL" if id_iol else "Migración",
                     int(id_iol) if id_iol else None))
    sql.append(insert("movimientos", ["fecha", "hermana_id", "tipo", "ticker", "cantidad", "monto", "moneda",
                                      "tc_manual", "plataforma", "aportante", "nota", "origen", "iol_numero"], movs))

    # Efectivo (Config B13:G15)
    efe = [(ID[h], "IOL", ars or 0, usd or 0, act, fuente)
           for h, ars, usd, _, act, fuente in cfg.iter_rows(min_row=13, max_row=15, min_col=2, max_col=7,
                                                            values_only=True)]
    sql.append(insert("efectivo", ["hermana_id", "plataforma", "ars", "usd", "actualizado", "fuente"], efe))

    # Cierres (A..G)
    cie = [(ID[h], fecha(m), usd, tc, reg, fuente) for m, h, usd, tc, _, reg, fuente in filas(wb["Cierres"], 5, 7)]
    sql.append(insert("cierres", ["hermana_id", "mes", "total_usd", "mep_cierre", "registrado_el", "fuente"], cie))

    # Planificaciones guardadas (Historial): hoy vacío, pero se migra si hubiera
    hist = list(filas(wb["Historial"], 5, 14))
    if hist:
        raise SystemExit(f"Historial tiene {len(hist)} filas: falta implementar su migración.")

    # Proyecciones: supuestos y aportes planeados de cada solapa. El gasto de ejemplo no se migra.
    # Los tramos "Vos" del Excel se armaron con edades supuestas: se recalculan con la fecha de
    # nacimiento real (aporte propio desde el año siguiente a cumplir 18, hasta los 40).
    proy, tramos = [], []
    for i, nombre, _, nac, _ in HERMANAS:
        ws = wb[nombre]
        c = lambda r: ws.cell(r, 3).value
        proy.append((i, c(55), c(56), c(57), c(58), c(61), c(62)))
        for r in range(52, 58):
            desde, hasta, monto, quien = (ws.cell(r, k).value for k in range(5, 9))
            if desde is None:
                continue
            if quien == "Vos":
                desde, hasta = nac.year + 19, nac.year + 40
            tramos.append((i, desde, hasta, monto, "Joaquín" if quien == "Joaquín" else "Propio"))
    sql.append(insert("proyecciones", ["hermana_id", "rend_esperado", "rend_pesimista", "rend_optimista",
                                       "edad_hasta", "meta_usd", "meta_edad"], proy))
    sql.append(insert("proy_tramos", ["hermana_id", "desde_anio", "hasta_anio", "monto_usd_mes", "quien"], tramos))

    sql.append("insert into public.sync_log (disparo, estado, fin, resumen) values ('migracion', 'ok', now(), "
               + q('{"fuente": "Inversiones Chicas v2.xlsm", "movimientos": %d}' % len(movs)) + ");\n\n")
    sql.append("commit;\n")
    return "".join(sql), len(movs)


def num_ar(s):
    return float(s.replace(".", "").replace(",", "."))


def mep_ambito(desde, hasta):
    """Histórico del MEP de Ámbito, pedido por año. Si Ámbito falla en un tramo (le pasa con algún
    dato roto), lo parte al medio hasta aislar el día que falla, y saltea solo ese día."""
    def pedir(a, b):
        r = requests.get(f"https://mercados.ambito.com/dolarrava/mep/historico-general/{a}/{b}",
                         headers={"User-Agent": "Mozilla/5.0"}, timeout=60)
        r.raise_for_status()
        return {datetime.datetime.strptime(f, "%d/%m/%Y").date(): num_ar(v) for f, v in r.json()[1:]}

    def seguro(a, b):
        try:
            return pedir(a, b)
        except requests.HTTPError:
            if a == b:
                print(f"  ! Ámbito no devolvió el MEP del {a:%d/%m/%Y}")
                return {}
            m = a + (b - a) // 2
            return {**seguro(a, m), **seguro(m + datetime.timedelta(days=1), b)}

    hist = {}
    for anio in range(desde.year, hasta.year + 1):
        hist.update(seguro(max(desde, datetime.date(anio, 1, 1)), min(hasta, datetime.date(anio, 12, 31))))
    return hist


def ajustes():
    sql = ["-- Ajustes posteriores a la verificación contra el Excel.\nbegin;\n\n"]

    # 1) AAPL regalado por IOL: no fue una compra ni un aporte de Joaquín.
    for h, monto in REGALO_IOL.items():
        sql.append(f"update public.movimientos set tipo = 'Ingreso de títulos', aportante = null,\n"
                   f"  nota = 'Regalo de IOL por abrir la cuenta de menores (valor al ingreso)'\n"
                   f"where hermana_id = {ID[h]} and ticker = 'AAPL' and tipo = 'Compra' and iol_numero is null;\n")
        sql.append(f"update public.movimientos set monto = monto - {monto},\n"
                   f"  nota = 'Aporte inicial de Joaquín (el AAPL fue regalo de IOL)'\n"
                   f"where hermana_id = {ID[h]} and tipo = 'Aporte' and origen = 'Migración';\n")
        # el regalo cuenta como aportado (aportante Regalo), así el rendimiento mide solo la inversión
        sql.append(f"insert into public.movimientos (fecha, hermana_id, tipo, monto, moneda, plataforma, aportante,"
                   f" nota, origen)\nselect fecha, hermana_id, 'Aporte', monto, moneda, plataforma, 'Regalo',\n"
                   f"  'Regalo de IOL por la cuenta de menores: 1 AAPL (se registra como aporte en especie)',"
                   f" 'Migración'\nfrom public.movimientos where hermana_id = {ID[h]} and ticker = 'AAPL'"
                   f" and tipo = 'Ingreso de títulos';\n\n")

    # 2) MEP histórico de Ámbito (dólar MEP, valor de referencia de cada cierre)
    hist = mep_ambito(MEP_DESDE, datetime.date.today())
    vivo = requests.get("https://mercados.ambito.com/dolarrava/mep/variacion",
                        headers={"User-Agent": "Mozilla/5.0"}, timeout=30).json()
    valor_vivo = num_ar(vivo["valor"])
    fecha_vivo = datetime.datetime.strptime(vivo["fecha"][:10], "%d/%m/%Y").date()
    sql.append("delete from public.mep;\n")
    sql.append(insert("mep", ["fecha", "referencia", "fuente"],
                      [(d, v, "Ámbito") for d, v in sorted(hist.items())]))
    sql.append(f"update public.mep_vivo set valor = {valor_vivo}, fecha = {q(fecha_vivo)}, "
               f"fuente = 'Ámbito', actualizado = now();\n\n")
    sql.append("commit;\n")
    return "".join(sql), len(hist), valor_vivo, fecha_vivo


def main():
    os.makedirs(SALIDA, exist_ok=True)
    wb = load_workbook(EXCEL, read_only=True, data_only=True)
    sql, n = datos_excel(wb)
    with open(os.path.join(SALIDA, "01_datos_excel.sql"), "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"01_datos_excel.sql: {n} movimientos")
    sql, n_mep, vivo, fv = ajustes()
    with open(os.path.join(SALIDA, "02_ajustes.sql"), "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"02_ajustes.sql: {n_mep} días de MEP de Ámbito, MEP vivo {vivo} ({fv})")


if __name__ == "__main__":
    main()
