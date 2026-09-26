-- v_resumen_hermana suma aportes_regalo_usd. Se recrean las vistas que dependen de ella.
drop view public.v_seguimiento;
drop view public.v_categorias_hermana;
drop view public.v_resumen_hermana;

create view public.v_resumen_hermana with (security_invoker = true) as
with mov as (
  select hermana_id,
         coalesce(sum(monto_usd) filter (where tipo = 'Aporte'), 0) as aportes_usd,
         coalesce(sum(monto_usd) filter (where tipo = 'Aporte' and aportante = 'Joaquín'), 0) as aportes_joaquin_usd,
         coalesce(sum(monto_usd) filter (where tipo = 'Aporte' and aportante = 'Propio'), 0) as aportes_propio_usd,
         coalesce(sum(monto_usd) filter (where tipo = 'Aporte' and aportante = 'Regalo'), 0) as aportes_regalo_usd,
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
         coalesce(m.aportes_regalo_usd, 0) as aportes_regalo_usd,
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
