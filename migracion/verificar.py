#!/usr/bin/env python3
"""
verificar.py — Genera salida/verificacion.sql: una consulta que compara lo que calcula la base
(vistas v_resumen_hermana y v_posiciones) contra los valores que el Excel tiene calculados
(solapa Calc, leída en modo solo lectura). Devuelve una fila por dato con la diferencia.

Uso:  py migracion/verificar.py   → correr salida/verificacion.sql contra Supabase.
"""
import os

from openpyxl import load_workbook

from migrar_excel import EXCEL, ID, SALIDA, q

# Calc!Y..AL (resumen por hermana) → columna de v_resumen_hermana
RESUMEN = {27: "aportado_neto_usd", 28: "aportes_joaquin_usd", 29: "aportes_propio_usd", 30: "retiros_usd",
           31: "efectivo_usd", 32: "valor_posiciones_usd", 33: "total_usd", 34: "resultado_usd",
           35: "rendimiento", 36: "costo_posiciones_usd", 37: "aportado_neto_ars", 38: "n_posiciones"}
# Calc!B..R (posiciones) → columna de v_posiciones
POSICIONES = {5: "cantidad", 8: "ppc_usd", 10: "precio_usado", 11: "valor_usd", 13: "resultado_usd"}


def main():
    wb = load_workbook(EXCEL, read_only=True, data_only=True)
    ws = wb["Calc"]
    esperado = []   # (hermana, ticker, campo, valor excel)
    for r in range(5, 8):
        h = ws.cell(r, 25).value
        for c, campo in RESUMEN.items():
            esperado.append(("resumen", h, "", campo, ws.cell(r, c).value))
    n_movs = {}
    for row in wb["Movimientos"].iter_rows(min_row=6, max_col=2, values_only=True):
        if row[0] is not None:
            n_movs[row[1]] = n_movs.get(row[1], 0) + 1
    for h, n in n_movs.items():
        esperado.append(("resumen", h, "", "n_movimientos", n))
    for row in ws.iter_rows(min_row=5, max_row=124, min_col=1, max_col=18, values_only=True):
        clave = row[1]
        if not clave:
            continue
        h, tk = clave.split("|")
        for c, campo in POSICIONES.items():
            esperado.append(("posicion", h, tk, campo, row[c - 1] if row[c - 1] != "" else None))

    valores = ",\n".join(f"  ({q(t)}, {ID[h]}, {q(h)}, {q(tk) if tk else chr(39) * 2}, {q(campo)}, {q(v)}::numeric)"
                         for t, h, tk, campo, v in esperado)
    sql = f"""-- Generado por verificar.py. Compara Excel (esperado) vs base (calculado).
with esperado (tipo, hermana_id, hermana, ticker, campo, excel) as (values
{valores}
), base as (
  select 'resumen' as tipo, hermana_id, '' as ticker, kv.key as campo, kv.value::numeric as base
  from public.v_resumen_hermana r, jsonb_each_text(to_jsonb(r)) kv
  where kv.key in ({", ".join(q(c) for c in list(RESUMEN.values()) + ["n_movimientos"])})
  union all
  select 'posicion', hermana_id, ticker, kv.key, kv.value::numeric
  from public.v_posiciones p, jsonb_each_text(to_jsonb(p)) kv
  where kv.key in ({", ".join(q(c) for c in POSICIONES.values())})
), comp as (
  select e.tipo, e.hermana_id, e.hermana, nullif(e.ticker, '') as ticker, e.campo,
         round(e.excel, 4) as excel, round(b.base, 4) as base,
         round(coalesce(b.base, 0) - coalesce(e.excel, 0), 6) as diferencia,
         abs(coalesce(b.base, 0) - coalesce(e.excel, 0)) < 0.005 as ok
  from esperado e
  left join base b using (tipo, hermana_id, ticker, campo)
)
-- resumen completo + cualquier posición que no coincida + conteo final
select tipo, hermana, ticker, campo, excel, base, diferencia, ok from (
  select *, 1 as orden from comp where tipo = 'resumen' or not ok
  union all
  select 'TOTAL', 9, count(*) filter (where ok) || ' de ' || count(*) || ' datos coinciden', null, null,
         null, null, null, bool_and(ok), 2 from comp
) x
order by orden, hermana_id, tipo desc, ticker, campo;
"""
    with open(os.path.join(SALIDA, "verificacion.sql"), "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"verificacion.sql: {len(esperado)} datos a comparar")


if __name__ == "__main__":
    main()
