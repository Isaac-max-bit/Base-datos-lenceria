-- ============================================================
-- CARGAR PRODUCTOS · Lencería LR
-- Supabase → SQL Editor → New query → pega TODO y Run.
--
-- Modelo real:
--   "Producto".tipo_id       → "TipoProducto" (categoría)
--   "VarianteProducto"       → talla, color y stock por variante
--
-- Este script:
--   1. Borra los 3 productos viejos y sus variantes.
--   2. Repara las secuencias.
--   3. Crea los tipos que falten.
--   4. Inserta los 21 productos de ejemplo.
--   5. Crea tallas S/M/L por producto en "VarianteProducto".
--   6. Agrega "precio_anterior" para las ofertas.
--   7. Crea "ImagenProducto" (una o varias imágenes).
--   8. Deja la lectura pública (RLS + GRANT).
--   9. Muestra el resultado final.
--
-- Es idempotente: se puede ejecutar varias veces.
-- ============================================================

-- 1) Borrar los 3 productos actuales, sus variantes y los detalles
--    de pedido que usan esas variantes (si no, la FK lo impide).

-- 1.1) Detalles de pedido que referencian las variantes de esos productos.
--      La columna de la FK puede llamarse distinto de id_variante, así que
--      se busca automáticamente en information_schema.
do $$
declare
    v_columna text;
begin
    select kcu.column_name
      into v_columna
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and tc.table_name = 'DetallePedido'
      and ccu.table_name = 'VarianteProducto'
      and ccu.column_name = 'id_variante'
    limit 1;

    if v_columna is null then
        raise exception 'No se encontró la FK de DetallePedido hacia VarianteProducto';
    end if;

    execute format(
        $sql$
        delete from "DetallePedido"
        where %I in (
            select v.id_variante
            from "VarianteProducto" v
            join "Producto" p on p.id_producto = v.producto_id
            where p.id_producto in (1, 2, 3)
               or lower(p.nombre) in (
                   lower('Brasier de encaje'),
                   lower('Conjunto de lencería'),
                   lower('Top básico')
               )
        )
        $sql$,
        v_columna
    );
end $$;

-- 1.2) Variantes de esos productos
delete from "VarianteProducto"
where producto_id in (
    select id_producto
    from "Producto"
    where id_producto in (1, 2, 3)
       or lower(nombre) in (
           lower('Brasier de encaje'),
           lower('Conjunto de lencería'),
           lower('Top básico')
       )
);

-- 1.3) Productos
delete from "Producto"
where id_producto in (1, 2, 3)
   or lower(nombre) in (
       lower('Brasier de encaje'),
       lower('Conjunto de lencería'),
       lower('Top básico')
   );

-- 2) Reparar secuencias (después del borrado)
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

    v_seq := pg_get_serial_sequence('public."TipoProducto"', 'id_tipo');
    if v_seq is not null then
        perform setval(
            v_seq,
            coalesce((select max(id_tipo) from "TipoProducto"), 0) + 1,
            false
        );
    end if;

    v_seq := pg_get_serial_sequence('public."VarianteProducto"', 'id_variante');
    if v_seq is not null then
        perform setval(
            v_seq,
            coalesce((select max(id_variante) from "VarianteProducto"), 0) + 1,
            false
        );
    end if;
end $$;

-- 3) Crear los 7 tipos que falten (sin duplicar por nombre)
insert into "TipoProducto" (nombre)
select v.nombre
from (values
    ('Conjuntos'),
    ('Brasieres'),
    ('Tops'),
    ('Panties'),
    ('Pijamas'),
    ('Bodies'),
    ('Medias')
) as v(nombre)
where not exists (
    select 1
    from "TipoProducto" t
    where lower(trim(t.nombre)) = lower(v.nombre)
);

-- 4) Datos de ejemplo (una fila por producto)
create temporary table seed_productos (
    nombre      text primary key,
    descripcion text,
    categoria   text not null,
    precio      numeric(10, 2) not null,
    stock       integer not null,
    color       text not null
) on commit drop;

insert into seed_productos (nombre, descripcion, categoria, precio, stock, color) values
    ('Conjunto Encaje',   'Conjunto en encaje, color negro.',            'conjuntos', 79900, 12, 'Negro'),
    ('Conjunto Romance',  'Conjunto suave, color rosado.',               'conjuntos', 74900,  9, 'Rosado'),
    ('Conjunto Delicado', 'Conjunto ligero, color beige.',               'conjuntos', 69900, 15, 'Beige'),
    ('Brasier Clásico',   'Brasier de uso diario, color negro.',         'brasieres', 49900, 20, 'Negro'),
    ('Brasier Comodidad', 'Brasier sin varillas, color beige.',          'brasieres', 54900, 18, 'Beige'),
    ('Brasier Encanto',   'Brasier con detalle en encaje, color vino.',  'brasieres', 59900, 10, 'Vino'),
    ('Top Essential',     'Top básico, color negro.',                    'tops',      34900, 25, 'Negro'),
    ('Top Rosé',          'Top suave, color rosado.',                    'tops',      39900, 14, 'Rosado'),
    ('Top Natural',       'Top ligero, color blanco.',                   'tops',      36900, 16, 'Blanco'),
    ('Pantie Clásico',    'Pantie de algodón, color negro.',             'panties',   19900, 30, 'Negro'),
    ('Pantie Suave',      'Pantie sin costuras, color beige.',           'panties',   22900, 22, 'Beige'),
    ('Pantie Encaje',     'Pantie en encaje, color vino.',               'panties',   24900, 19, 'Vino'),
    ('Pijama Satinada',   'Pijama de satín, color rosado.',              'pijamas',   94900,  8, 'Rosado'),
    ('Pijama Nocturna',   'Pijama cómoda, color negro.',                 'pijamas',   89900, 11, 'Negro'),
    ('Pijama Sueños',     'Pijama suave, color lila.',                   'pijamas',   84900,  7, 'Lila'),
    ('Body Elegante',     'Body entero, color negro.',                   'bodies',    89900,  6, 'Negro'),
    ('Body Romance',      'Body en encaje, color vino.',                 'bodies',    84900,  9, 'Vino'),
    ('Body Natural',      'Body suave, color beige.',                    'bodies',    79900, 13, 'Beige'),
    ('Medias Clásicas',   'Medias veladas, color negro.',                'medias',    14900, 24, 'Negro'),
    ('Medias Delicadas',  'Medias transparentes, color beige.',          'medias',    17900, 21, 'Beige'),
    ('Medias Elegantes',  'Medias con encaje, color vino.',              'medias',    19900, 17, 'Vino');

-- 5) Insertar productos (solo nombre, descripción, tipo, precio y stock)
insert into "Producto" (nombre, descripcion, tipo_id, precio, stock)
select
    s.nombre,
    s.descripcion,
    (
        select t.id_tipo
        from "TipoProducto" t
        where lower(trim(t.nombre)) = lower(s.categoria)
        order by t.id_tipo
        limit 1
    ),
    s.precio,
    s.stock
from seed_productos s
where not exists (
    select 1
    from "Producto" p
    where lower(p.nombre) = lower(s.nombre)
)
and exists (
    select 1
    from "TipoProducto" t
    where lower(trim(t.nombre)) = lower(s.categoria)
);

-- 6) Crear variantes S/M/L por producto, con el color del producto
insert into "VarianteProducto" (producto_id, talla, color, stock)
select
    p.id_producto,
    v.talla,
    s.color,
    case
        when v.talla = 'S' then s.stock / 3
        when v.talla = 'M' then s.stock / 3
        else s.stock - 2 * (s.stock / 3)
    end
from seed_productos s
join "Producto" p
  on lower(p.nombre) = lower(s.nombre)
cross join (values ('S'), ('M'), ('L')) as v(talla)
where not exists (
    select 1
    from "VarianteProducto" x
    where x.producto_id = p.id_producto
      and x.talla = v.talla
      and x.color = s.color
);

-- 7) El stock del producto queda como la suma de sus variantes
update "Producto" p
set stock = coalesce(
    (
        select sum(v.stock)
        from "VarianteProducto" v
        where v.producto_id = p.id_producto
    ),
    0
);

-- 8) Precio anterior: la columna que usa el front para mostrar ofertas.
--    Solo se muestra el descuento si precio_anterior > precio.
alter table "Producto"
    add column if not exists precio_anterior numeric(10, 2);

update "Producto" p
set precio_anterior = v.precio_anterior
from (values
    ('Conjunto Encaje',   99900),
    ('Conjunto Romance',  89900),
    ('Brasier Encanto',   74900),
    ('Top Rosé',          49900),
    ('Pijama Satinada',  119900),
    ('Body Elegante',    109900),
    ('Medias Elegantes',  24900)
) as v(nombre, precio_anterior)
where lower(p.nombre) = lower(v.nombre);

-- 9) Tabla de imágenes (una o varias por producto)
create table if not exists "ImagenProducto" (
    id_imagen bigint generated by default as identity primary key,
    producto_id bigint not null
        references "Producto" (id_producto) on delete cascade,
    url text not null,
    orden integer not null default 0,
    es_principal boolean not null default false,
    fecha_creacion timestamptz not null default now()
);

alter table "ImagenProducto"
    add column if not exists orden integer not null default 0;
alter table "ImagenProducto"
    add column if not exists es_principal boolean not null default false;
alter table "ImagenProducto"
    add column if not exists fecha_creacion timestamptz not null default now();

create index if not exists "ImagenProducto_producto_id_idx"
    on "ImagenProducto" (producto_id);

-- Solo puede haber una imagen principal por producto.
create unique index if not exists "ImagenProducto_un_principal"
    on "ImagenProducto" (producto_id)
    where es_principal;

-- 10) RLS: lectura pública para el catálogo
alter table "Producto" enable row level security;
alter table "TipoProducto" enable row level security;
alter table "VarianteProducto" enable row level security;
alter table "ImagenProducto" enable row level security;

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

drop policy if exists "variantes_lectura_publica" on "VarianteProducto";
create policy "variantes_lectura_publica"
    on "VarianteProducto"
    for select
    to public
    using (true);

drop policy if exists "imagenes_lectura_publica" on "ImagenProducto";
create policy "imagenes_lectura_publica"
    on "ImagenProducto"
    for select
    to public
    using (true);

grant usage on schema public to anon, authenticated;
grant select on "Producto" to anon, authenticated;
grant select on "TipoProducto" to anon, authenticated;
grant select on "VarianteProducto" to anon, authenticated;
grant select on "ImagenProducto" to anon, authenticated;

-- 11) Comprobación final
select 'Producto' as tabla, count(*) as filas from "Producto"
union all
select 'TipoProducto' as tabla, count(*) as filas from "TipoProducto"
union all
select 'VarianteProducto' as tabla, count(*) as filas from "VarianteProducto"
union all
select 'ImagenProducto' as tabla, count(*) as filas from "ImagenProducto";

select
    p.id_producto,
    p.nombre,
    t.nombre as tipo,
    p.precio,
    p.stock,
    (
        select json_agg(
            json_build_object(
                'talla', v.talla,
                'color', v.color,
                'stock', v.stock
            )
            order by case v.talla
                when 'XS' then 1
                when 'S'  then 2
                when 'M'  then 3
                when 'L'  then 4
                when 'XL' then 5
                else 99
            end
        )
        from "VarianteProducto" v
        where v.producto_id = p.id_producto
    ) as variantes
from "Producto" p
left join "TipoProducto" t on t.id_tipo = p.tipo_id
order by p.id_producto;
