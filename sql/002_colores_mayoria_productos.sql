-- ==========================================================
-- Colores para la mayoría de productos
-- Ejecutar DESPUÉS de 001_variantes_talla_color.sql (opcional:
-- este script funciona incluso si la 001 no se ha ejecutado,
-- porque usa NOT EXISTS en vez de ON CONFLICT).
--
-- Qué hace:
--   - A cada producto le agrega 2 colores nuevos.
--   - Mantiene el color que ya tenía (no lo duplica).
--   - Crea las 3 tallas S/M/L para cada color nuevo.
--   - NO modifica el stock de las variantes que ya existen.
--   - Recalcula "Producto".stock con la suma real de variantes.
--
-- Stock de los colores nuevos: 3 unidades por talla.
-- Si quieres otro valor, cambia el tercer número de cada fila
-- en el bloque "combinaciones".
-- ==========================================================

with combinaciones (producto_id, color, stock) as (
    values
        -- 1  Conjunto Encaje      (actual: Negro)
        (1,  'Vino',   3),
        (1,  'Beige',  3),

        -- 2  Conjunto Romance    (actual: Rosado)
        (2,  'Vino',   3),
        (2,  'Negro',  3),

        -- 3  Conjunto Delicado   (actual: Beige)
        (3,  'Blanco', 3),
        (3,  'Rosado', 3),

        -- 4  Brasier Clásico     (actual: Negro)
        (4,  'Beige',  3),
        (4,  'Vino',   3),

        -- 5  Brasier Comodidad   (actual: Beige)
        (5,  'Negro',  3),
        (5,  'Blanco', 3),

        -- 6  Brasier Encanto     (actual: Vino)
        (6,  'Negro',  3),
        (6,  'Rosado', 3),

        -- 7  Top Essential       (actual: Negro)
        (7,  'Blanco', 3),
        (7,  'Beige',  3),

        -- 8  Top Rosé            (actual: Rosado)
        (8,  'Vino',   3),
        (8,  'Negro',  3),

        -- 9  Top Natural         (actual: Blanco)
        (9,  'Beige',  3),
        (9,  'Negro',  3),

        -- 10 Pantie Clásico      (actual: Negro)
        (10, 'Beige',  3),
        (10, 'Rosado', 3),

        -- 11 Pantie Suave        (actual: Beige)
        (11, 'Negro',  3),
        (11, 'Blanco', 3),

        -- 12 Pantie Encaje       (actual: Vino)
        (12, 'Negro',  3),
        (12, 'Rosado', 3),

        -- 13 Pijama Satinada     (actual: Rosado)
        (13, 'Lila',   3),
        (13, 'Negro',  3),

        -- 14 Pijama Nocturna     (actual: Negro)
        (14, 'Vino',   3),
        (14, 'Lila',   3),

        -- 15 Pijama Sueños       (actual: Lila)
        (15, 'Rosado', 3),
        (15, 'Beige',  3),

        -- 16 Body Elegante       (actual: Negro)
        (16, 'Vino',   3),
        (16, 'Beige',  3),

        -- 17 Body Romance        (actual: Vino)
        (17, 'Rosado', 3),
        (17, 'Negro',  3),

        -- 18 Body Natural        (actual: Beige)
        (18, 'Blanco', 3),
        (18, 'Negro',  3),

        -- 19 Medias Clásicas     (actual: Negro)
        (19, 'Beige',  3),
        (19, 'Vino',   3),

        -- 20 Medias Delicadas    (actual: Beige)
        (20, 'Negro',  3),
        (20, 'Blanco', 3),

        -- 21 Medias Elegantes    (actual: Vino)
        (21, 'Negro',  3),
        (21, 'Beige',  3)
)
insert into "VarianteProducto" (producto_id, talla, color, stock)
select
    p.id_producto,
    t.talla,
    c.color,
    c.stock
from combinaciones c
join "Producto" p on p.id_producto = c.producto_id
cross join (values ('S'), ('M'), ('L')) as t(talla)
where not exists (
    select 1
    from "VarianteProducto" v
    where v.producto_id = c.producto_id
      and v.talla = t.talla
      and v.color = c.color
);


-- Recalcular el stock total de cada producto que tenga variantes.
-- Funciona igual si el trigger de la 001 está activo o no.
update "Producto" p
   set stock = coalesce((
       select sum(v.stock)
       from "VarianteProducto" v
       where v.producto_id = p.id_producto
   ), 0)
 where exists (
       select 1
       from "VarianteProducto" v
       where v.producto_id = p.id_producto
 );


-- ==========================================================
-- Verificación
-- ==========================================================

-- Resumen por producto: colores, variantes y stock total.
select
    p.id_producto,
    p.nombre,
    count(distinct v.color) as colores,
    count(*)                as variantes,
    sum(v.stock)            as stock_total
from "Producto" p
join "VarianteProducto" v on v.producto_id = p.id_producto
group by p.id_producto, p.nombre
order by p.id_producto;

-- Detalle de un producto (cambia el 1 si quieres otro).
select id_variante, talla, color, stock
from "VarianteProducto"
where producto_id = 1
order by color, talla;
