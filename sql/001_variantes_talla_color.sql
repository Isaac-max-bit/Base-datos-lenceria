-- ==========================================================
-- Variantes por talla + color
-- Ejecutar en Supabase → SQL Editor.
-- Es idempotente: se puede correr varias veces.
--
-- Modelo actual (correcto):
--   "Producto" 1 ─── N "VarianteProducto"
--   Cada fila de "VarianteProducto" = una combinación
--   (producto_id, talla, color) con su propio stock.
--
-- Este script NO agrega colores ni tallas nuevas: solo protege
-- la tabla para que las combinaciones no se dupliquen ni queden
-- inconsistentes.
-- ==========================================================


-- 1) Una sola fila por producto + talla + color.
--    Sin esto, el front puede encontrar dos variantes iguales y
--    elegir una al azar.
do $$
begin
    if exists (
        select 1
        from "VarianteProducto"
        group by producto_id, talla, color
        having count(*) > 1
    ) then
        raise notice 'Hay combinaciones producto+talla+color repetidas. Corrige esos datos antes de crear la restricción única.';
    elsif not exists (
        select 1
        from pg_constraint
        where conname = 'variante_unica_producto_talla_color'
    ) then
        alter table "VarianteProducto"
            add constraint variante_unica_producto_talla_color
            unique (producto_id, talla, color);
    end if;
end $$;


-- 2) Talla y color obligatorios.
--    Si algún producto no maneja color (ej. accesorios), usa
--    'Sin color' en lugar de NULL.
do $$
begin
    if exists (
        select 1
        from "VarianteProducto"
        where talla is null or color is null
    ) then
        raise notice 'Hay variantes con talla o color NULL. Corrige esos datos antes de aplicar NOT NULL.';
    else
        alter table "VarianteProducto" alter column talla set not null;
        alter table "VarianteProducto" alter column color set not null;
    end if;
end $$;


-- 3) El stock nunca puede ser negativo.
do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'variante_stock_no_negativo'
    ) then
        alter table "VarianteProducto"
            add constraint variante_stock_no_negativo
            check (stock >= 0);
    end if;
end $$;


-- 4) Índice para cargar rápido las variantes de un producto.
create index if not exists idx_variante_producto
    on "VarianteProducto" (producto_id);


-- 5) Mantener "Producto".stock = suma del stock de sus variantes.
--    El backend ya recalcula el stock al vender, pero el campo
--    "Producto".stock puede quedar desactualizado si se edita a mano.
create or replace function public.sincronizar_stock_producto()
returns trigger
language plpgsql
as $$
declare
    id_afectado integer;
begin
    if tg_op = 'DELETE' then
        id_afectado := old.producto_id;

    elsif tg_op = 'UPDATE' and old.producto_id is distinct from new.producto_id then
        update "Producto" p
           set stock = coalesce((
               select sum(v.stock)
               from "VarianteProducto" v
               where v.producto_id = old.producto_id
           ), 0)
         where p.id_producto = old.producto_id;

        id_afectado := new.producto_id;

    else
        id_afectado := new.producto_id;
    end if;

    update "Producto" p
       set stock = coalesce((
           select sum(v.stock)
           from "VarianteProducto" v
           where v.producto_id = id_afectado
       ), 0)
     where p.id_producto = id_afectado;

    return null;
end;
$$;

drop trigger if exists trg_variante_stock on "VarianteProducto";

create trigger trg_variante_stock
after insert or update of stock, producto_id or delete
on "VarianteProducto"
for each row
execute function public.sincronizar_stock_producto();


-- 6) Sincronizar una vez los valores que ya existen.
update "Producto" p
   set stock = coalesce((
       select sum(v.stock)
       from "VarianteProducto" v
       where v.producto_id = p.id_producto
   ), 0);


-- ==========================================================
-- OPCIONAL: catálogo de colores con su hex
-- ==========================================================
-- Hoy el front tiene los hex en src/api/catalogo.js (COLOR_HEX).
-- Si quieres que el admin pueda cambiar los colores sin tocar
-- código, crea esta tabla y luego expón un GET /colores.
--
-- create table if not exists "Color" (
--     id_color serial primary key,
--     nombre text not null unique,
--     hex text not null check (hex ~ '^#[0-9a-fA-F]{6}$')
-- );
--
-- insert into "Color" (nombre, hex) values
--     ('Negro',  '#1c1a1b'),
--     ('Blanco', '#f7f3ee'),
--     ('Beige',  '#d8c3a5'),
--     ('Rosado', '#d98a9b'),
--     ('Vino',   '#5b2333'),
--     ('Lila',   '#b9a2cf')
-- on conflict (nombre) do update set hex = excluded.hex;


-- ==========================================================
-- OPCIONAL: una foto distinta por color
-- ==========================================================
-- Si cada color tiene fotos propias, agrega la columna y luego
-- filtra la galería por color en el backend/frontend.
--
-- alter table "ImagenProducto"
--     add column if not exists color text;
