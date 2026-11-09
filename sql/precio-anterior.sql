-- ============================================================
-- PRECIO ANTERIOR · OFERTAS
-- Supabase → SQL Editor → New query → pega TODO y Run.
--
-- Agrega la columna "precio_anterior" a "Producto" y la llena
-- con precios de ejemplo para algunos productos.
--
-- El front solo muestra el descuento si precio_anterior > precio.
-- Es idempotente: se puede ejecutar varias veces.
-- ============================================================

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

-- Comprobación: productos con oferta
select
    id_producto,
    nombre,
    precio,
    precio_anterior,
    round((1 - precio / precio_anterior) * 100) as descuento_pct
from "Producto"
where precio_anterior is not null
  and precio_anterior > precio
order by id_producto;
