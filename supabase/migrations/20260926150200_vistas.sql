-- Vistas de cálculo: reemplazan la solapa oculta Calc del Excel.
-- Todas con security_invoker = true: respetan el RLS de quien consulta (una hermana solo ve lo suyo).

-- ------------------------------------------------------------------ dólar MEP en uso
-- La cotización en vivo; si no hay, el último cierre (MEP_ACTUAL del Excel).
create view public.v_mep_actual with (security_invoker = true) as
select coalesce((select valor from public.mep_vivo),
                (select referencia from public.mep order by fecha desc limit 1)) as valor,
       coalesce((select fecha from public.mep_vivo),
                (select max(fecha) from public.mep)) as fecha;

-- ------------------------------------------------------------------ movimientos en USD
-- TC: el manual pisa; si no, el MEP del último día con dato <= fecha (el VLOOKUP del Excel);
-- si no hay histórico, el actual.
create view public.v_movimientos with (security_invoker = true) as
select m.*,
       date_trunc('month', m.fecha)::date as mes,
       x.tc_usado,
       case when m.moneda = 'USD' then m.monto else m.monto / x.tc_usado end as monto_usd,
       case when m.moneda = 'USD' then m.monto * x.tc_usado else m.monto end as monto_ars,
       case when m.cantidad > 0
            then (case when m.moneda = 'USD' then m.monto else m.monto / x.tc_usado end) / m.cantidad
       end as precio_unit_usd
from public.movimientos m
cross join lateral (
  select coalesce(m.tc_manual,
                  (select r.referencia from public.mep r where r.fecha <= m.fecha
                   order by r.fecha desc limit 1),
                  (select valor from public.v_mep_actual)) as tc_usado
) x;

-- ------------------------------------------------------------------ tickers con precio en USD
create view public.v_tickers with (security_invoker = true) as
select t.*,
       c.nombre as categoria,
       c.color as categoria_color,
       case when t.precio is null then null
            else (case when t.moneda = 'USD' then t.precio
                       else t.precio / (select valor from public.v_mep_actual) end) / t.cotiza_cada
       end as precio_usd
from public.tickers t
left join public.categorias c on c.id = t.categoria_id;

-- ------------------------------------------------------------------ posiciones
-- Cantidad = compras + ingresos - ventas. PPC = costo de compras / cantidad comprada.
-- Sin precio actual se valoriza al PPC.
create view public.v_posiciones with (security_invoker = true) as
with base as (
  select hermana_id, ticker,
         sum(case when tipo = 'Venta' then -cantidad else cantidad end) as cantidad,
         sum(case when tipo <> 'Venta' then cantidad else 0 end) as cant_comprada,
         sum(case when tipo <> 'Venta' then monto_usd else 0 end) as costo_compras_usd,
         (array_agg(plataforma order by fecha, id))[1] as plataforma
  from public.v_movimientos
  where tipo in ('Compra', 'Venta', 'Ingreso de títulos')
  group by hermana_id, ticker
), c as (
  select b.*,
         case when b.cant_comprada > 0 then b.costo_compras_usd / b.cant_comprada end as ppc_usd,
         t.precio_usd, t.nombre, t.categoria, t.categoria_color
  from base b
  left join public.v_tickers t on t.ticker = b.ticker
), v as (
  select c.*, coalesce(nullif(c.precio_usd, 0), c.ppc_usd, 0) as precio_usado
  from c
)
select hermana_id, ticker,
       coalesce(nombre, ticker) as nombre,
       coalesce(categoria, 'Otros') as categoria,
       coalesce(categoria_color, '#9CA3AF') as categoria_color,
       plataforma, cantidad, cant_comprada, costo_compras_usd, ppc_usd, precio_usd, precio_usado,
       cantidad * precio_usado as valor_usd,
       cantidad * coalesce(ppc_usd, 0) as costo_usd,
       cantidad * precio_usado - cantidad * coalesce(ppc_usd, 0) as resultado_usd,
       case when cantidad * coalesce(ppc_usd, 0) > 0
            then (cantidad * precio_usado) / (cantidad * ppc_usd) - 1 end as resultado_pct,
       cantidad > 0.000001 as activa
from v;

-- ------------------------------------------------------------------ efectivo por hermana
create view public.v_efectivo with (security_invoker = true) as
select h.id as hermana_id,
       coalesce(sum(e.ars), 0) as ars,
       coalesce(sum(e.usd), 0) as usd,
       coalesce(sum(e.ars), 0) / (select valor from public.v_mep_actual) + coalesce(sum(e.usd), 0) as total_usd,
       max(e.actualizado) as actualizado
from public.hermanas h
left join public.efectivo e on e.hermana_id = h.id
group by h.id;

-- ------------------------------------------------------------------ resumen por hermana
create view public.v_resumen_hermana with (security_invoker = true) as
with mov as (
  select hermana_id,
         coalesce(sum(monto_usd) filter (where tipo = 'Aporte'), 0) as aportes_usd,
         coalesce(sum(monto_usd) filter (where tipo = 'Aporte' and aportante = 'Joaquín'), 0) as aportes_joaquin_usd,
         coalesce(sum(monto_usd) filter (where tipo = 'Aporte' and aportante = 'Propio'), 0) as aportes_propio_usd,
         coalesce(sum(monto_usd) filter (where tipo = 'Retiro'), 0) as retiros_usd,
         coalesce(sum(monto_ars) filter (where tipo = 'Aporte'), 0) as aportes_ars,
         coalesce(sum(monto_ars) filter (where tipo = 'Retiro'), 0) as retiros_ars,
         count(*) as n_movimientos
  from public.v_movimientos
  group by hermana_id
), pos as (
  select hermana_id,
         sum(valor_usd) as valor_posiciones_usd,
         sum(costo_usd) as costo_posiciones_usd,
         count(*) filter (where activa) as n_posiciones
  from public.v_posiciones
  group by hermana_id
), t as (
  select h.id as hermana_id, h.nombre, h.color, h.orden,
         coalesce(m.aportes_usd, 0) - coalesce(m.retiros_usd, 0) as aportado_neto_usd,
         coalesce(m.aportes_joaquin_usd, 0) as aportes_joaquin_usd,
         coalesce(m.aportes_propio_usd, 0) as aportes_propio_usd,
         coalesce(m.retiros_usd, 0) as retiros_usd,
         coalesce(m.aportes_ars, 0) - coalesce(m.retiros_ars, 0) as aportado_neto_ars,
         e.total_usd as efectivo_usd,
         coalesce(p.valor_posiciones_usd, 0) as valor_posiciones_usd,
         coalesce(p.costo_posiciones_usd, 0) as costo_posiciones_usd,
         coalesce(p.n_posiciones, 0) as n_posiciones,
         coalesce(m.n_movimientos, 0) as n_movimientos
  from public.hermanas h
  join public.v_efectivo e on e.hermana_id = h.id
  left join mov m on m.hermana_id = h.id
  left join pos p on p.hermana_id = h.id
)
select t.*,
       efectivo_usd + valor_posiciones_usd as total_usd,
       efectivo_usd + valor_posiciones_usd - aportado_neto_usd as resultado_usd,
       case when aportado_neto_usd > 0
            then (efectivo_usd + valor_posiciones_usd - aportado_neto_usd) / aportado_neto_usd end as rendimiento
from t;

-- ------------------------------------------------------------------ por categoría (real vs objetivo)
create view public.v_categorias_hermana with (security_invoker = true) as
with cats as (
  select id, nombre, color, objetivo_pct, orden from public.categorias
  union all
  select 99::smallint, 'Otros', '#9CA3AF', null, 99::smallint
), pos as (
  select hermana_id, categoria, sum(valor_usd) as valor from public.v_posiciones group by 1, 2
), v as (
  select h.id as hermana_id, c.id as categoria_id, c.nombre as categoria, c.color, c.objetivo_pct, c.orden,
         coalesce(p.valor, 0) + case when c.nombre = 'Disponibilidades' then r.efectivo_usd else 0 end as valor_usd,
         r.total_usd
  from public.hermanas h
  cross join cats c
  join public.v_resumen_hermana r on r.hermana_id = h.id
  left join pos p on p.hermana_id = h.id and p.categoria = c.nombre
)
select hermana_id, categoria_id, categoria, color, objetivo_pct, orden, valor_usd,
       case when total_usd <> 0 then valor_usd / total_usd end as pct,
       case when total_usd <> 0 and objetivo_pct is not null then valor_usd / total_usd - objetivo_pct end as desvio
from v;

-- ------------------------------------------------------------------ seguimiento mensual
-- Mes cerrado: valor de cierres; mes en curso: valor de hoy. Igual que la solapa Seguimiento.
create view public.v_seguimiento with (security_invoker = true) as
with mes_actual as (
  select date_trunc('month', current_date)::date as m
), mov as (
  select hermana_id, mes,
         coalesce(sum(monto_usd) filter (where tipo = 'Aporte'), 0) as ingresos_usd,
         coalesce(sum(monto_usd) filter (where tipo = 'Retiro'), 0) as retiros_usd,
         coalesce(sum(monto_ars) filter (where tipo = 'Aporte'), 0) as ingresos_ars,
         coalesce(sum(monto_ars) filter (where tipo = 'Retiro'), 0) as retiros_ars
  from public.v_movimientos
  group by hermana_id, mes
), inicio as (
  select h.id as hermana_id,
         least((select min(date_trunc('month', v.fecha))::date from public.movimientos v where v.hermana_id = h.id),
               (select min(c.mes) from public.cierres c where c.hermana_id = h.id)) as mes0
  from public.hermanas h
), meses as (
  select i.hermana_id, g::date as mes
  from inicio i
  cross join lateral generate_series(i.mes0, (select m from mes_actual), interval '1 month') g
  where i.mes0 is not null
), base as (
  select ms.hermana_id, ms.mes,
         ms.mes = (select m from mes_actual) as es_mes_actual,
         case when ms.mes = (select m from mes_actual) then r.total_usd else c.total_usd end as cierre_usd,
         case when ms.mes = (select m from mes_actual) then (select valor from public.v_mep_actual)
              else (select x.referencia from public.mep x
                    where x.fecha <= (ms.mes + interval '1 month - 1 day')::date
                    order by x.fecha desc limit 1)
         end as mep_cierre,
         coalesce(mv.ingresos_usd, 0) as ingresos_usd,
         coalesce(mv.retiros_usd, 0) as retiros_usd,
         coalesce(mv.ingresos_ars, 0) as ingresos_ars,
         coalesce(mv.retiros_ars, 0) as retiros_ars
  from meses ms
  left join public.cierres c on c.hermana_id = ms.hermana_id and c.mes = ms.mes
  left join mov mv on mv.hermana_id = ms.hermana_id and mv.mes = ms.mes
  left join public.v_resumen_hermana r on r.hermana_id = ms.hermana_id
), con_inicio as (
  select b.*,
         coalesce(lag(b.cierre_usd) over w,
                  (select c2.total_usd from public.cierres c2
                   where c2.hermana_id = b.hermana_id and c2.mes = (b.mes - interval '1 month')::date),
                  0) as inicio_usd,
         coalesce(lag(b.mep_cierre) over w,
                  (select x.referencia from public.mep x where x.fecha < b.mes order by x.fecha desc limit 1),
                  b.mep_cierre) as mep_inicio
  from base b
  window w as (partition by b.hermana_id order by b.mes)
), res as (
  select ci.*,
         ci.cierre_usd - ci.inicio_usd - ci.ingresos_usd + ci.retiros_usd as resultado_usd,
         case when ci.cierre_usd is not null and ci.inicio_usd + ci.ingresos_usd > 0
              then (ci.cierre_usd - ci.inicio_usd - ci.ingresos_usd + ci.retiros_usd)
                   / (ci.inicio_usd + ci.ingresos_usd) end as rendimiento_mes
  from con_inicio ci
)
select hermana_id, mes, es_mes_actual,
       inicio_usd, cierre_usd, ingresos_usd, retiros_usd, resultado_usd,
       sum(coalesce(resultado_usd, 0)) over w as resultado_acum_usd,
       rendimiento_mes,
       exp(sum(ln(greatest(1 + coalesce(rendimiento_mes, 0), 1e-12))) over w) - 1 as rendimiento_acum,
       sum(ingresos_usd - retiros_usd) over w as aportado_acum_usd,
       mep_inicio, mep_cierre,
       inicio_usd * mep_inicio as inicio_ars,
       cierre_usd * mep_cierre as cierre_ars,
       ingresos_ars, retiros_ars,
       cierre_usd * mep_cierre - inicio_usd * mep_inicio - ingresos_ars + retiros_ars as resultado_ars
from res
window w as (partition by hermana_id order by mes);

-- ------------------------------------------------------------------ planificación
create view public.v_plan_items with (security_invoker = true) as
with i as (
  select pi.*, p.hermana_id, p.mes, p.capital_ars,
         coalesce(p.mep, (select valor from public.v_mep_actual)) as mep,
         case pi.nivel when 'Bajo' then p.pct_bajo when 'Medio' then p.pct_medio
                       when 'Alto' then p.pct_alto end as pct_capital
  from public.plan_items pi
  join public.planes p on p.id = pi.plan_id
)
select i.*,
       t.categoria,
       i.pct_nivel * i.pct_capital * i.capital_ars as monto_ars,
       case when i.nivel = 'Venta' then i.cantidad * pos.precio_usado
            else i.pct_nivel * i.pct_capital * i.capital_ars / i.mep end as monto_usd,
       (select coalesce(sum(v.monto_usd), 0) from public.v_movimientos v
        where v.hermana_id = i.hermana_id and v.ticker = i.ticker and v.mes = i.mes
          and v.tipo = case when i.nivel = 'Venta' then 'Venta'::public.tipo_movimiento
                            else 'Compra'::public.tipo_movimiento end) as ejecutado_usd
from i
left join public.v_tickers t on t.ticker = i.ticker
left join public.v_posiciones pos on pos.hermana_id = i.hermana_id and pos.ticker = i.ticker;
