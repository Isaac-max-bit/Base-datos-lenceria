-- ============================================================
-- STORAGE · IMÁGENES DE PRODUCTOS
-- Supabase → SQL Editor → New query → pega TODO y Run.
--
-- Crea el bucket público "productos" y permite la lectura pública.
-- Los archivos se suben desde el backend con la service_role key;
-- por eso no hace falta una política de escritura para anon.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

drop policy if exists "productos_imagenes_lectura" on storage.objects;
create policy "productos_imagenes_lectura"
    on storage.objects
    for select
    to public
    using (bucket_id = 'productos');

-- Si más adelante quieres que el dashboard suba archivos directamente
-- desde el navegador (sin pasar por el backend), agrega una política
-- para usuarios autenticados. Con el backend actual NO es necesaria:
--
-- drop policy if exists "productos_imagenes_escritura" on storage.objects;
-- create policy "productos_imagenes_escritura"
--     on storage.objects
--     for insert
--     to authenticated
--     with check (bucket_id = 'productos');
