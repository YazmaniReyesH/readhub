-- =============================================================================
-- ReadHub — seed.sql (datos de prueba)
-- =============================================================================
-- Puebla la base de datos con usuarios, artículos, vistas, likes, comentarios
-- y favoritos de ejemplo.
--
-- Cómo se crean los usuarios:
--   La autenticación la gestiona Supabase Auth (tabla auth.users). Este seed
--   inserta los usuarios directamente en auth.users con la contraseña hasheada
--   (bcrypt vía pgcrypto) y su identidad de email. El trigger
--   `on_auth_user_created` crea automáticamente la fila en public.profiles.
--
-- Credenciales de todos los usuarios de prueba:  Password123!
--
-- Ejecución:
--   * Automática con:  npx supabase db reset   (corre migraciones + seed)
--   * Manual:          psql "$SUPABASE_DB_URL" -f supabase/seed.sql
--
-- Es idempotente: usa UUIDs fijos y ON CONFLICT DO NOTHING.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Usuarios (auth.users) + identidades (auth.identities)
-- -----------------------------------------------------------------------------
-- UUIDs fijos:
--   alice = 11111111-...  (writer)
--   bob   = 22222222-...  (writer)
--   admin = 33333333-...  (admin)

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'alice@readhub.dev',
    crypt('Password123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Alice Autora","birth_date":"1995-04-12","phone":"3001112233","role":"writer"}',
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'bob@readhub.dev',
    crypt('Password123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Bob Escritor","birth_date":"1990-09-30","phone":"3004445566","role":"writer"}',
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated', 'admin@readhub.dev',
    crypt('Password123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin ReadHub","birth_date":"1988-01-20","phone":"3007778899","role":"admin"}',
    '', '', '', ''
  )
on conflict do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"alice@readhub.dev","email_verified":true}',
    'email', now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"bob@readhub.dev","email_verified":true}',
    'email', now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"admin@readhub.dev","email_verified":true}',
    'email', now(), now(), now()
  )
on conflict do nothing;

-- Garantiza que los perfiles existan y tengan el rol correcto aunque el trigger
-- no se hubiera ejecutado (p. ej. si los usuarios ya existían).
insert into public.profiles (id, birth_date, phone, role, full_name)
values
  ('11111111-1111-1111-1111-111111111111', '1995-04-12', '3001112233', 'writer', 'Alice Autora'),
  ('22222222-2222-2222-2222-222222222222', '1990-09-30', '3004445566', 'writer', 'Bob Escritor'),
  ('33333333-3333-3333-3333-333333333333', '1988-01-20', '3007778899', 'admin', 'Admin ReadHub')
on conflict (id) do update
  set role = excluded.role,
      birth_date = excluded.birth_date,
      phone = excluded.phone,
      full_name = excluded.full_name;

-- -----------------------------------------------------------------------------
-- 2) Artículos
-- -----------------------------------------------------------------------------
-- UUIDs fijos: aaaaaaa1..a4
insert into public.articles (
  id, author_id, title, summary, document_path, image_path, is_public, created_at
)
values
  (
    'aaaaaaa1-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Introducción a Next.js 15',
    'Un recorrido por las novedades del App Router y los Server Components.',
    'article-documents/11111111-1111-1111-1111-111111111111/nextjs15.txt',
    'article-covers/11111111-1111-1111-1111-111111111111/nextjs15.jpg',
    true, now() - interval '3 days'
  ),
  (
    'aaaaaaa1-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'Row Level Security en Supabase',
    'Cómo proteger tus datos con políticas RLS desde el primer día.',
    'article-documents/11111111-1111-1111-1111-111111111111/rls.pdf',
    'article-covers/11111111-1111-1111-1111-111111111111/rls.jpg',
    true, now() - interval '2 days'
  ),
  (
    'aaaaaaa1-0000-0000-0000-000000000003',
    '22222222-2222-2222-2222-222222222222',
    'TypeScript para equipos',
    'Buenas prácticas de tipado fuerte en proyectos reales.',
    'article-documents/22222222-2222-2222-2222-222222222222/typescript.docx',
    'article-covers/22222222-2222-2222-2222-222222222222/typescript.jpg',
    true, now() - interval '1 day'
  ),
  (
    'aaaaaaa1-0000-0000-0000-000000000004',
    '22222222-2222-2222-2222-222222222222',
    'Borrador: arquitectura de ReadHub',
    'Notas internas todavía no publicadas.',
    'article-documents/22222222-2222-2222-2222-222222222222/borrador.txt',
    'article-covers/22222222-2222-2222-2222-222222222222/borrador.jpg',
    false, now()
  )
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 3) Visualizaciones (una fila por apertura; BR-011)
-- -----------------------------------------------------------------------------
insert into public.views (id, article_id, user_id, viewed_at)
values
  ('bbbbbbb1-0000-0000-0000-000000000001', 'aaaaaaa1-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', now() - interval '2 days'),
  ('bbbbbbb1-0000-0000-0000-000000000002', 'aaaaaaa1-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', now() - interval '1 day'),
  ('bbbbbbb1-0000-0000-0000-000000000003', 'aaaaaaa1-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', now() - interval '5 hours'),
  ('bbbbbbb1-0000-0000-0000-000000000004', 'aaaaaaa1-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', now() - interval '3 hours')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 4) Likes (UNIQUE(article_id, user_id); BR-013)
-- -----------------------------------------------------------------------------
insert into public.likes (id, article_id, user_id, created_at)
values
  ('ccccccc1-0000-0000-0000-000000000001', 'aaaaaaa1-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', now() - interval '1 day'),
  ('ccccccc1-0000-0000-0000-000000000002', 'aaaaaaa1-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', now() - interval '20 hours'),
  ('ccccccc1-0000-0000-0000-000000000003', 'aaaaaaa1-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', now() - interval '2 hours')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 5) Comentarios (no vacíos; BR-017)
-- -----------------------------------------------------------------------------
insert into public.comments (id, article_id, user_id, comment, created_at)
values
  ('ddddddd1-0000-0000-0000-000000000001', 'aaaaaaa1-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Excelente introducción, muy clara.', now() - interval '1 day'),
  ('ddddddd1-0000-0000-0000-000000000002', 'aaaaaaa1-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Gracias por el aporte.', now() - interval '18 hours'),
  ('ddddddd1-0000-0000-0000-000000000003', 'aaaaaaa1-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Muy útil para el equipo.', now() - interval '1 hour')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 6) Favoritos (privados por usuario)
-- -----------------------------------------------------------------------------
insert into public.favorites (id, article_id, user_id, created_at)
values
  ('eeeeeee1-0000-0000-0000-000000000001', 'aaaaaaa1-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', now()),
  ('eeeeeee1-0000-0000-0000-000000000002', 'aaaaaaa1-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', now())
on conflict do nothing;
