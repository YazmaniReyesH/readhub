-- =============================================================================
-- ReadHub — Validación de políticas RLS
-- =============================================================================
-- Comprueba que las políticas Row Level Security se comportan como se espera
-- para cada tipo de usuario:
--   * Usuario NO autenticado (anon)
--   * Usuario autenticado sin permisos (no propietario)
--   * Propietario del recurso
--   * Administrador
--   * Restricciones de negocio (like duplicado, comentario vacío)
--
-- Cómo funciona:
--   Cada prueba se ejecuta dentro de su propia transacción e impersona un rol
--   con `SET LOCAL role` + `SET LOCAL request.jwt.claims`. Así `auth.uid()`
--   devuelve el UUID simulado y las políticas se evalúan como en producción.
--   Los bloques DO imprimen PASS / FAIL con RAISE NOTICE. Las escrituras se
--   revierten con ROLLBACK, por lo que el script no deja datos.
--
-- Es SQL puro (sin metacomandos de psql), por lo que puede ejecutarse con:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/rls_validation.sql
--   npm run db:test         (runner de Node incluido en el proyecto)
--   o pegándolo en el SQL Editor de Supabase.
--
-- Requisitos: haber ejecutado antes las migraciones y el seed.
--
-- UUIDs del seed:
--   alice (writer, propietaria art. 1 y 2) = 11111111-1111-1111-1111-111111111111
--   bob   (writer, propietario art. 3 y 4) = 22222222-2222-2222-2222-222222222222
--   admin (admin)                          = 33333333-3333-3333-3333-333333333333
--   art. 1 (público, de alice)  = aaaaaaa1-0000-0000-0000-000000000001
--   art. 4 (privado,  de bob)   = aaaaaaa1-0000-0000-0000-000000000004
-- =============================================================================

do $$ begin raise notice '================ VALIDACIÓN RLS — ReadHub ================'; end $$;

-- -----------------------------------------------------------------------------
-- ESCENARIO 1 — Usuario NO autenticado (anon)
-- -----------------------------------------------------------------------------
do $$ begin raise notice '--- Escenario 1: anónimo ---'; end $$;
begin;
  set local role anon;
  set local request.jwt.claims = '{"role":"anon"}';

  -- 1.1 Puede leer artículos públicos (esperado: 3 públicos del seed).
  do $$
  declare n int;
  begin
    select count(*) into n from public.articles;
    if n = 3 then raise notice 'PASS 1.1 anon lee % artículos públicos', n;
    else raise notice 'FAIL 1.1 anon debería ver 3 públicos, vio %', n; end if;
  end $$;

  -- 1.2 NO puede ver el artículo privado (art. 4).
  do $$
  declare n int;
  begin
    select count(*) into n from public.articles
      where id = 'aaaaaaa1-0000-0000-0000-000000000004';
    if n = 0 then raise notice 'PASS 1.2 anon no ve el artículo privado';
    else raise notice 'FAIL 1.2 anon vio el artículo privado'; end if;
  end $$;

  -- 1.3 NO puede leer perfiles.
  do $$
  declare n int;
  begin
    select count(*) into n from public.profiles;
    if n = 0 then raise notice 'PASS 1.3 anon no lee perfiles';
    else raise notice 'FAIL 1.3 anon leyó % perfiles', n; end if;
  end $$;

  -- 1.4 NO puede insertar artículos.
  do $$
  begin
    insert into public.articles (author_id, title, image_path, document_path)
    values ('11111111-1111-1111-1111-111111111111', 'hack', 'i', 'd');
    raise notice 'FAIL 1.4 anon pudo insertar un artículo';
  exception when others then
    raise notice 'PASS 1.4 anon no puede insertar (%)', sqlerrm;
  end $$;
rollback;

-- -----------------------------------------------------------------------------
-- ESCENARIO 2 — Autenticado sin permisos (bob actuando sobre recursos de alice)
-- -----------------------------------------------------------------------------
do $$ begin raise notice '--- Escenario 2: autenticado no propietario (bob) ---'; end $$;
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

  -- 2.1 Puede leer artículos públicos.
  do $$
  declare n int;
  begin
    select count(*) into n from public.articles where is_public;
    if n >= 3 then raise notice 'PASS 2.1 bob lee artículos públicos (%)', n;
    else raise notice 'FAIL 2.1 bob no lee públicos, vio %', n; end if;
  end $$;

  -- 2.2 NO puede actualizar un artículo de alice.
  do $$
  declare afectadas int;
  begin
    update public.articles set title = 'secuestrado'
      where id = 'aaaaaaa1-0000-0000-0000-000000000001';
    get diagnostics afectadas = row_count;
    if afectadas = 0 then raise notice 'PASS 2.2 bob no puede actualizar artículo ajeno';
    else raise notice 'FAIL 2.2 bob actualizó % artículo(s) ajeno(s)', afectadas; end if;
  end $$;

  -- 2.3 NO puede insertar un artículo poniendo a alice como autora.
  do $$
  begin
    insert into public.articles (author_id, title, image_path, document_path)
    values ('11111111-1111-1111-1111-111111111111', 'suplantación', 'i', 'd');
    raise notice 'FAIL 2.3 bob insertó un artículo a nombre de alice';
  exception when others then
    raise notice 'PASS 2.3 bob no puede insertar a nombre de otro (%)', sqlerrm;
  end $$;

  -- 2.4 NO puede ver las visualizaciones de un artículo de alice.
  do $$
  declare n int;
  begin
    select count(*) into n from public.views
      where article_id = 'aaaaaaa1-0000-0000-0000-000000000001';
    if n = 0 then raise notice 'PASS 2.4 bob no ve las vistas de un artículo ajeno';
    else raise notice 'FAIL 2.4 bob vio % vistas ajenas', n; end if;
  end $$;

  -- 2.5 NO puede ver los favoritos de alice.
  do $$
  declare n int;
  begin
    select count(*) into n from public.favorites
      where user_id = '11111111-1111-1111-1111-111111111111';
    if n = 0 then raise notice 'PASS 2.5 bob no ve favoritos ajenos';
    else raise notice 'FAIL 2.5 bob vio % favoritos ajenos', n; end if;
  end $$;

  -- 2.6 Puede insertar un like propio.
  do $$
  begin
    insert into public.likes (article_id, user_id)
    values ('aaaaaaa1-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222');
    raise notice 'PASS 2.6 bob puede dar like como sí mismo';
  exception when others then
    raise notice 'FAIL 2.6 bob no pudo dar un like propio (%)', sqlerrm;
  end $$;
rollback;

-- -----------------------------------------------------------------------------
-- ESCENARIO 3 — Propietario (alice sobre sus propios recursos)
-- -----------------------------------------------------------------------------
do $$ begin raise notice '--- Escenario 3: propietario (alice) ---'; end $$;
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

  -- 3.1 Puede actualizar su propio artículo.
  do $$
  declare afectadas int;
  begin
    update public.articles set summary = 'resumen actualizado'
      where id = 'aaaaaaa1-0000-0000-0000-000000000001';
    get diagnostics afectadas = row_count;
    if afectadas = 1 then raise notice 'PASS 3.1 alice actualiza su artículo';
    else raise notice 'FAIL 3.1 alice no pudo actualizar su artículo (filas %)', afectadas; end if;
  end $$;

  -- 3.2 Ve las visualizaciones de su artículo.
  do $$
  declare n int;
  begin
    select count(*) into n from public.views
      where article_id = 'aaaaaaa1-0000-0000-0000-000000000001';
    if n >= 1 then raise notice 'PASS 3.2 alice ve las vistas de su artículo (%)', n;
    else raise notice 'FAIL 3.2 alice no ve las vistas de su artículo'; end if;
  end $$;

  -- 3.3 Ve solo su propio perfil.
  do $$
  declare n int; propios int;
  begin
    select count(*) into n from public.profiles;
    select count(*) into propios from public.profiles
      where id = '11111111-1111-1111-1111-111111111111';
    if n = 1 and propios = 1 then raise notice 'PASS 3.3 alice solo ve su perfil';
    else raise notice 'FAIL 3.3 alice ve % perfiles (propios=%)', n, propios; end if;
  end $$;

  -- 3.4 Ve sus propios favoritos.
  do $$
  declare n int;
  begin
    select count(*) into n from public.favorites;
    if n >= 1 then raise notice 'PASS 3.4 alice ve sus favoritos (%)', n;
    else raise notice 'FAIL 3.4 alice no ve sus favoritos'; end if;
  end $$;
rollback;

-- -----------------------------------------------------------------------------
-- ESCENARIO 4 — Administrador
-- -----------------------------------------------------------------------------
do $$ begin raise notice '--- Escenario 4: admin ---'; end $$;
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

  -- 4.1 Ve todos los perfiles.
  do $$
  declare n int;
  begin
    select count(*) into n from public.profiles;
    if n >= 3 then raise notice 'PASS 4.1 admin ve todos los perfiles (%)', n;
    else raise notice 'FAIL 4.1 admin solo vio % perfiles', n; end if;
  end $$;

  -- 4.2 Ve el artículo privado de bob.
  do $$
  declare n int;
  begin
    select count(*) into n from public.articles
      where id = 'aaaaaaa1-0000-0000-0000-000000000004';
    if n = 1 then raise notice 'PASS 4.2 admin ve el artículo privado';
    else raise notice 'FAIL 4.2 admin no ve el artículo privado'; end if;
  end $$;

  -- 4.3 Puede eliminar un comentario ajeno.
  do $$
  declare afectadas int;
  begin
    delete from public.comments
      where id = 'ddddddd1-0000-0000-0000-000000000001';
    get diagnostics afectadas = row_count;
    if afectadas = 1 then raise notice 'PASS 4.3 admin elimina comentario ajeno';
    else raise notice 'FAIL 4.3 admin no pudo eliminar comentario ajeno (filas %)', afectadas; end if;
  end $$;

  -- 4.4 Ve las visualizaciones de cualquier artículo.
  do $$
  declare n int;
  begin
    select count(*) into n from public.views;
    if n >= 1 then raise notice 'PASS 4.4 admin ve todas las visualizaciones (%)', n;
    else raise notice 'FAIL 4.4 admin no ve visualizaciones'; end if;
  end $$;
rollback;

-- -----------------------------------------------------------------------------
-- ESCENARIO 5 — Restricciones de integridad (reglas de negocio)
-- -----------------------------------------------------------------------------
do $$ begin raise notice '--- Escenario 5: restricciones de negocio ---'; end $$;
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

  -- 5.1 BR-013: un usuario no puede dar dos likes al mismo artículo.
  do $$
  begin
    insert into public.likes (article_id, user_id)
    values ('aaaaaaa1-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222');
    raise notice 'FAIL 5.1 se permitió un segundo like (bob ya dio like al art. 1 en el seed)';
  exception when unique_violation then
    raise notice 'PASS 5.1 like duplicado bloqueado por UNIQUE (BR-013)';
  when others then
    raise notice 'PASS 5.1 like duplicado bloqueado (%)', sqlerrm;
  end $$;

  -- 5.2 BR-017: no se permiten comentarios vacíos.
  do $$
  begin
    insert into public.comments (article_id, user_id, comment)
    values ('aaaaaaa1-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '   ');
    raise notice 'FAIL 5.2 se permitió un comentario vacío';
  exception when check_violation then
    raise notice 'PASS 5.2 comentario vacío bloqueado por CHECK (BR-017)';
  when others then
    raise notice 'PASS 5.2 comentario vacío bloqueado (%)', sqlerrm;
  end $$;
rollback;

do $$ begin raise notice '================ FIN DE LA VALIDACIÓN ================'; end $$;
