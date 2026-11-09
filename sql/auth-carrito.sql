-- ============================================================
-- AUTENTICACIÓN Y CARRITO
-- Supabase → SQL Editor → New query → pega TODO y Run.
--
-- Este script:
--   1. Crea los roles admin, cliente y vendedor.
--   2. Evita carritos duplicados por usuario + variante.
--   3. Activa RLS en las tablas privadas (el backend entra con
--      la service_role key; nadie más puede leerlas).
--   4. Agrega índices para las consultas del carrito y pedidos.
--
-- Es idempotente: se puede ejecutar varias veces.
-- ============================================================

-- 1) Roles
insert into "Rol" (id_rol, nombre)
values
    (1, 'admin'),
    (2, 'cliente'),
    (3, 'vendedor')
on conflict (id_rol) do update set nombre = excluded.nombre;

-- Si id_rol es identity, adelantar la secuencia.
do $$
declare
    v_seq text;
begin
    v_seq := pg_get_serial_sequence('public."Rol"', 'id_rol');

    if v_seq is not null then
        perform setval(
            v_seq,
            coalesce((select max(id_rol) from "Rol"), 0) + 1,
            false
        );
    end if;
end $$;

-- 2) Un solo renglón por usuario y variante
delete from "Carrito" a
using "Carrito" b
where a.usuario_id = b.usuario_id
  and a.variante_id = b.variante_id
  and a.id_carrito > b.id_carrito;

create unique index if not exists "Carrito_usuario_variante_unico"
    on "Carrito" (usuario_id, variante_id);

-- 3) Índices de consulta
create index if not exists "Carrito_usuario_id_idx"
    on "Carrito" (usuario_id);

create index if not exists "Pedido_usuario_id_idx"
    on "Pedido" (usuario_id);

create index if not exists "DetallePedido_pedido_id_idx"
    on "DetallePedido" (pedido_id);

-- 4) RLS: datos privados sin acceso público.
--    El backend usa la service_role key, que omite RLS.
alter table "Rol" enable row level security;
alter table "Usuario" enable row level security;
alter table "Carrito" enable row level security;
alter table "Pedido" enable row level security;
alter table "DetallePedido" enable row level security;

-- OJO: No se crean políticas para anon. El catálogo (Producto,
-- TipoProducto, VarianteProducto, ImagenProducto) sigue con su
-- lectura pública en cargar-productos.sql.

-- 5) Comprobación
select id_rol, nombre from "Rol" order by id_rol;

select
    'Usuario' as tabla, count(*) as filas from "Usuario"
union all
select 'Carrito' as tabla, count(*) as filas from "Carrito"
union all
select 'Pedido' as tabla, count(*) as filas from "Pedido"
union all
select 'DetallePedido' as tabla, count(*) as filas from "DetallePedido";

-- ============================================================
-- CÓMO DAR ROLES (ejecuta solo lo que necesites)
-- ============================================================
-- Vendedor:
-- update "Usuario"
-- set id_rol = (select id_rol from "Rol" where nombre = 'vendedor')
-- where lower(email) = lower('correo-del-vendedor@ejemplo.com');
--
-- Administrador:
-- update "Usuario"
-- set id_rol = (select id_rol from "Rol" where nombre = 'admin')
-- where lower(email) = lower('correo-del-admin@ejemplo.com');
--
-- Cliente (por defecto):
-- update "Usuario"
-- set id_rol = (select id_rol from "Rol" where nombre = 'cliente')
-- where lower(email) = lower('correo-del-cliente@ejemplo.com');
