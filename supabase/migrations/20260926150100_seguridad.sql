-- Row Level Security: cada hermana ve solo lo suyo, el admin ve y edita todo.
-- Las hermanas son de solo lectura. El rol anon no ve nada (el selector de perfiles del login
-- lo arma el servidor).

create schema if not exists app;
grant usage on schema app to authenticated;

create function app.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles where user_id = auth.uid() and rol = 'admin');
$$;

create function app.mi_hermana() returns smallint
language sql stable security definer set search_path = '' as $$
  select hermana_id from public.perfiles where user_id = auth.uid();
$$;

revoke all on function app.es_admin(), app.mi_hermana() from public, anon;
grant execute on function app.es_admin(), app.mi_hermana() to authenticated;

-- anon no tiene nada que hacer contra las tablas: se le sacan los permisos por completo.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- RLS en todas las tablas
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Tablas por hermana: lectura propia (o admin), escritura solo admin.
do $$
declare t text;
begin
  foreach t in array array['movimientos', 'efectivo', 'cierres', 'planes', 'proyecciones',
                           'proy_tramos', 'proy_gastos', 'tesis'] loop
    execute format($f$
      create policy lectura on public.%1$I for select to authenticated
        using ((select app.es_admin()) or hermana_id = (select app.mi_hermana()));
      create policy escritura_admin on public.%1$I for all to authenticated
        using ((select app.es_admin())) with check ((select app.es_admin()));
    $f$, t);
  end loop;
end $$;

create policy lectura on public.hermanas for select to authenticated
  using ((select app.es_admin()) or id = (select app.mi_hermana()));
create policy escritura_admin on public.hermanas for all to authenticated
  using ((select app.es_admin())) with check ((select app.es_admin()));

create policy lectura on public.plan_items for select to authenticated
  using (exists (select 1 from public.planes p where p.id = plan_id
                 and ((select app.es_admin()) or p.hermana_id = (select app.mi_hermana()))));
create policy escritura_admin on public.plan_items for all to authenticated
  using ((select app.es_admin())) with check ((select app.es_admin()));

-- Cada uno ve su propio perfil; el admin, todos. Los perfiles los crea el servidor.
create policy lectura on public.perfiles for select to authenticated
  using (user_id = (select auth.uid()) or (select app.es_admin()));

-- Catálogos compartidos: los lee cualquiera con sesión, los edita el admin.
do $$
declare t text;
begin
  foreach t in array array['plataformas', 'categorias', 'tickers', 'mep', 'mep_vivo'] loop
    execute format($f$
      create policy lectura on public.%1$I for select to authenticated using (true);
      create policy escritura_admin on public.%1$I for all to authenticated
        using ((select app.es_admin())) with check ((select app.es_admin()));
    $f$, t);
  end loop;
end $$;

-- Solo admin.
do $$
declare t text;
begin
  foreach t in array array['sync_log', 'alertas', 'reglas_alerta', 'config'] loop
    execute format($f$
      create policy solo_admin on public.%1$I for all to authenticated
        using ((select app.es_admin())) with check ((select app.es_admin()));
    $f$, t);
  end loop;
end $$;

-- Credenciales de IOL: el admin ve si están cargadas (sin la clave). Se escriben solo con la
-- función guardar_credencial_iol (etapa del sync); no hay política de escritura directa.
create policy lectura_admin on public.iol_credenciales for select to authenticated
  using ((select app.es_admin()));

-- intentos_login: sin políticas → solo service_role (el servidor de la app).
