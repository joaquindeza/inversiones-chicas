-- Sync con IOL: credenciales en Vault, token del cron y programación con pg_cron + pg_net.
-- IOL es SOLO LECTURA: la Edge Function sync-iol nunca llama endpoints de operar.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ------------------------------------------------------------------ credenciales de IOL
-- Se guardan cifradas en Vault. Esta función solo ESCRIBE; no existe ninguna que las devuelva
-- a un usuario. Solo el admin puede llamarla.
create function public.guardar_credencial_iol(p_hermana smallint, p_usuario text, p_clave text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_secreto text := jsonb_build_object('usuario', p_usuario, 'clave', p_clave)::text;
  v_nombre text := 'iol_' || p_hermana;
begin
  if not app.es_admin() then raise exception 'Solo el admin puede cargar credenciales'; end if;
  if coalesce(trim(p_usuario), '') = '' or coalesce(p_clave, '') = '' then raise exception 'Falta usuario o clave'; end if;
  select id into v_id from vault.secrets where name = v_nombre;
  if v_id is null then
    v_id := vault.create_secret(v_secreto, v_nombre, 'Credencial de IOL (solo lectura)');
  else
    perform vault.update_secret(v_id, v_secreto);
  end if;
  insert into public.iol_credenciales (hermana_id, vault_secret_id, usuario_mascara, cargada_el, ultimo_login_ok)
  values (p_hermana, v_id,
          left(p_usuario, 2) || repeat('•', greatest(length(p_usuario) - 4, 3)) || right(p_usuario, 2), now(), null)
  on conflict (hermana_id) do update
    set vault_secret_id = excluded.vault_secret_id, usuario_mascara = excluded.usuario_mascara,
        cargada_el = now(), ultimo_login_ok = null;
end $$;
revoke all on function public.guardar_credencial_iol(smallint, text, text) from public, anon;
grant execute on function public.guardar_credencial_iol(smallint, text, text) to authenticated;

-- Lectura de la credencial: SOLO service_role (la Edge Function). Ningún usuario puede llamarla.
create function public.leer_credencial_iol(p_hermana smallint)
returns jsonb language sql security definer set search_path = '' as $$
  select decrypted_secret::jsonb from vault.decrypted_secrets where name = 'iol_' || p_hermana;
$$;
revoke all on function public.leer_credencial_iol(smallint) from public, anon, authenticated;
grant execute on function public.leer_credencial_iol(smallint) to service_role;

-- ------------------------------------------------------------------ token del cron
-- El cron llama a la Edge Function con este token (en vez de un usuario). Vive en Vault.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'sync_cron_token',
                           'Token con el que pg_cron dispara sync-iol');

create function public.verificar_token_cron(p_token text)
returns boolean language sql security definer set search_path = '' as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'sync_cron_token' and decrypted_secret = p_token);
$$;
revoke all on function public.verificar_token_cron(text) from public, anon, authenticated;
grant execute on function public.verificar_token_cron(text) to service_role;

-- ------------------------------------------------------------------ programación del sync
-- off | 6h | diaria. Horarios en UTC: 6h = 00/06/12/18 UTC (21/03/09/15 hs de Argentina);
-- diaria = 23 UTC (20 hs de Argentina, con el mercado cerrado).
create function public.configurar_sync(p_frecuencia text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_cron text;
  v_comando text := $cmd$
    select net.http_post(
      url := 'https://ebgmziwyrkcvgbfgbgke.supabase.co/functions/v1/sync-iol',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-token',
        (select decrypted_secret from vault.decrypted_secrets where name = 'sync_cron_token')),
      body := '{"disparo": "cron"}'::jsonb,
      timeout_milliseconds := 10000)
  $cmd$;
begin
  if not app.es_admin() then raise exception 'Solo el admin puede cambiar el sync'; end if;
  if p_frecuencia not in ('off', '6h', 'diaria') then raise exception 'Frecuencia inválida'; end if;
  if exists (select 1 from cron.job where jobname = 'sync-iol') then perform cron.unschedule('sync-iol'); end if;
  v_cron := case p_frecuencia when '6h' then '0 */6 * * *' when 'diaria' then '0 23 * * *' end;
  if v_cron is not null then perform cron.schedule('sync-iol', v_cron, v_comando); end if;
  insert into public.config (clave, valor, actualizado) values ('sync_frecuencia', to_jsonb(p_frecuencia), now())
  on conflict (clave) do update set valor = excluded.valor, actualizado = now();
end $$;
revoke all on function public.configurar_sync(text) from public, anon;
grant execute on function public.configurar_sync(text) to authenticated;
