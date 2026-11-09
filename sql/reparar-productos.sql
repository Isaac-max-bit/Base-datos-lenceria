-- ============================================================
-- ⚠️ NO EJECUTAR TODAVÍA · PENDIENTE DE ADAPTAR
-- Este script agrega columnas categoria/color a "Producto".
-- El modelo correcto es:
--   categoría → "Producto".tipo_id → "TipoProducto"
--   color     → "VarianteProducto"
-- ============================================================
-- REPARAR · PRODUCTOS Y PERMISOS DE LECTURA
-- Supabase → SQL Editor → New query → pega TODO y Run.
--
-- Este script:
--   1. Repara la secuencia de "TipoProducto" ANTES de insertar.
--   2. Crea los 7 tipos que falten sin duplicarlos.
--   3. Deja la lectura pública (RLS + GRANT) para el catálogo.
--   4. Inserta los 21 productos de ejemplo que falten.
--   5. Muestra el estado final.
--
-- Es idempotente: puedes ejecutarlo varias veces.
--
-- Si quieres dejar SOLO los 21 productos de ejemplo y borrar los
-- que ya existen, ejecuta antes esta línea en el SQL Editor:
--   delete from "Producto" where id_producto in (1, 2, 3);
-- ============================================================

-- 1) Reparar secuencia y crear tipos faltantes
do $$
declare
    v_nombre    text;
    v_seq       text;
    v_siguiente integer;
begin
    v_seq := pg_get_serial_sequence('public."TipoProducto"', 'id_tipo');

    -- Si id_tipo es identity/serial, adelantamos la secuencia al máximo actual.
    if v_seq is not null then
        perform setval(
            v_seq,
            coalesce((select max(id_tipo) from "TipoProducto"), 0) + 1,
            false
        );
    end if;

    foreach v_nombre in array array[
        'Conjuntos', 'Brasieres', 'Tops', 'Panties',
        'Pijamas', 'Bodies', 'Medias'
    ]
    loop
        if not exists (
            select 1
            from "TipoProducto" t
            where lower(trim(t.nombre)) = lower(v_nombre)
        ) then
            if v_seq is not null then
                -- Identity/serial: dejamos que la secuencia asigne el id.
                insert into "TipoProducto" (nombre) values (v_nombre);
            else
                -- Columna integer sin secuencia: asignamos el id a mano.
                select coalesce(max(id_tipo), 0) + 1
                  into v_siguiente
                from "TipoProducto";

                insert into "TipoProducto" (id_tipo, nombre)
                values (v_siguiente, v_nombre);
            end if;
        end if;
    end loop;

    if v_seq is not null then
        perform setval(
            v_seq,
            coalesce((select max(id_tipo) from "TipoProducto"), 0) + 1,
            false
        );
    end if;
end $$;

-- 1.1) Reparar también la secuencia de "Producto"
--      (evita duplicate key si los 3 productos se insertaron a mano)
do $$
declare
    v_seq text;
begin
    v_seq := pg_get_serial_sequence('public."Producto"', 'id_producto');

    if v_seq is not null then
        perform setval(
            v_seq,
            coalesce((select max(id_producto) from "Producto"), 0) + 1,
            false
        );
    end if;
end $$;

-- 2) Columnas que usa el frontend (si ya existen, no hace nada)
alter table "Producto" add column if not exists categoria text;
alter table "Producto" add column if not exists color text;
alter table "Producto" add column if not exists imagen text;
alter table "Producto" add column if not exists precio_anterior numeric(10, 2);

-- 3) RLS: lectura pública del catálogo
alter table "Producto" enable row level security;
alter table "TipoProducto" enable row level security;

drop policy if exists "productos_lectura_publica" on "Producto";
create policy "productos_lectura_publica"
    on "Producto"
    for select
    to public
    using (true);

drop policy if exists "tipos_lectura_publica" on "TipoProducto";
create policy "tipos_lectura_publica"
    on "TipoProducto"
    for select
    to public
    using (true);

-- Permisos explícitos para la API (PostgREST) con la clave publishable.
grant usage on schema public to anon, authenticated;
grant select on "Producto" to anon, authenticated;
grant select on "TipoProducto" to anon, authenticated;

-- 4) Productos de ejemplo (solo inserta los que falten por nombre)
insert into "Producto"
    (nombre, descripcion, tipo_id, precio, stock, categoria, color, precio_anterior)
select
    v.nombre,
    v.descripcion,
    (
        select t.id_tipo
        from "TipoProducto" t
        where lower(trim(t.nombre)) = lower(v.categoria)
        order by t.id_tipo
        limit 1
    ),
    v.precio,
    v.stock,
    v.categoria,
    v.color,
    v.precio_anterior
from (values
    ('Conjunto Encaje',   'Conjunto en encaje, color negro.',           79900, 12, 'conjuntos', 'Negro',  99900),
    ('Conjunto Romance',  'Conjunto suave, color rosado.',              74900,  9, 'conjuntos', 'Rosado', null),
    ('Conjunto Delicado', 'Conjunto ligero, color beige.',              69900, 15, 'conjuntos', 'Beige',  null),
    ('Brasier Clásico',   'Brasier de uso diario, color negro.',        49900, 20, 'brasieres', 'Negro',  null),
    ('Brasier Comodidad', 'Brasier sin varillas, color beige.',         54900, 18, 'brasieres', 'Beige',  64900),
    ('Brasier Encanto',   'Brasier con detalle en encaje, color vino.', 59900, 10, 'brasieres', 'Vino',   null),
    ('Top Essential',     'Top básico, color negro.',                   34900, 25, 'tops',      'Negro',  null),
    ('Top Rosé',          'Top suave, color rosado.',                   39900, 14, 'tops',      'Rosado', 49900),
    ('Top Natural',       'Top ligero, color blanco.',                  36900, 16, 'tops',      'Blanco', null),
    ('Pantie Clásico',    'Pantie de algodón, color negro.',            19900, 30, 'panties',   'Negro',  null),
    ('Pantie Suave',      'Pantie sin costuras, color beige.',          22900, 22, 'panties',   'Beige',  null),
    ('Pantie Encaje',     'Pantie en encaje, color vino.',              24900, 19, 'panties',   'Vino',   29900),
    ('Pijama Satinada',   'Pijama de satín, color rosado.',             94900,  8, 'pijamas',   'Rosado', 119900),
    ('Pijama Nocturna',   'Pijama cómoda, color negro.',                89900, 11, 'pijamas',   'Negro',  null),
    ('Pijama Sueños',     'Pijama suave, color lila.',                  84900,  7, 'pijamas',   'Lila',   null),
    ('Body Elegante',     'Body entero, color negro.',                  89900,  6, 'bodies',    'Negro',  null),
    ('Body Romance',      'Body en encaje, color vino.',                84900,  9, 'bodies',    'Vino',   null),
    ('Body Natural',      'Body suave, color beige.',                   79900, 13, 'bodies',    'Beige',  99900),
    ('Medias Clásicas',   'Medias veladas, color negro.',               14900, 24, 'medias',    'Negro',  null),
    ('Medias Delicadas',  'Medias transparentes, color beige.',         17900, 21, 'medias',    'Beige',  null),
    ('Medias Elegantes',  'Medias con encaje, color vino.',             19900, 17, 'medias',    'Vino',   24900)
) as v(nombre, descripcion, precio, stock, categoria, color, precio_anterior)
where not exists (
    select 1
    from "Producto" p
    where lower(p.nombre) = lower(v.nombre)
);

-- 5) Comprobación final
select 'Producto' as tabla, count(*) as filas from "Producto"
union all
select 'TipoProducto' as tabla, count(*) as filas from "TipoProducto";

select
    p.id_producto,
    p.nombre,
    p.tipo_id,
    t.nombre as tipo,
    p.precio,
    p.stock,
    p.categoria,
    p.color,
    p.precio_anterior
from "Producto" p
left join "TipoProducto" t on t.id_tipo = p.tipo_id
order by p.id_producto;
