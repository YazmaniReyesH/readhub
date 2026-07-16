-- =============================================================================
-- ReadHub — Migración 0003: Supabase Storage
-- =============================================================================
-- Crea los buckets para los archivos de los artículos y sus políticas de
-- acceso sobre storage.objects.
--
-- Convención de rutas:  <user_id>/<nombre-archivo>
-- Así, la primera carpeta de la ruta identifica al propietario y permite
-- validar la pertenencia con (storage.foldername(name))[1] = auth.uid().
--
--  * article-covers    → imágenes de portada. Bucket PÚBLICO (lectura abierta).
--  * article-documents → documentos TXT/DOCX/PDF. Bucket PRIVADO.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Buckets
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'article-covers',
    'article-covers',
    true,
    5242880, -- 5 MB
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'article-documents',
    'article-documents',
    false,
    10485760, -- 10 MB
    array[
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  )
on conflict (id) do nothing;

-- =============================================================================
-- Políticas: article-covers (público en lectura, escritura del propietario)
-- =============================================================================
drop policy if exists "covers_select_public" on storage.objects;
create policy "covers_select_public"
  on storage.objects for select
  using (bucket_id = 'article-covers');

drop policy if exists "covers_insert_owner" on storage.objects;
create policy "covers_insert_owner"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'article-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "covers_update_owner" on storage.objects;
create policy "covers_update_owner"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'article-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "covers_delete_owner" on storage.objects;
create policy "covers_delete_owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'article-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- =============================================================================
-- Políticas: article-documents (lectura autenticada, escritura del propietario)
-- =============================================================================
-- En el MVP todo artículo publicado es visible para usuarios autenticados
-- (BR-012), por lo que cualquier usuario con sesión puede leer los documentos.
drop policy if exists "documents_select_authenticated" on storage.objects;
create policy "documents_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'article-documents');

drop policy if exists "documents_insert_owner" on storage.objects;
create policy "documents_insert_owner"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'article-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "documents_update_owner" on storage.objects;
create policy "documents_update_owner"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'article-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "documents_delete_owner" on storage.objects;
create policy "documents_delete_owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'article-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
