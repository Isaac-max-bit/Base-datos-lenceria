-- ============================================================
-- DIAGNÓSTICO · PRODUCTOS
-- Supabase → SQL Editor → New query → pega TODO y Run.
-- Copia el resultado de cada consulta si algo no coincide.
-- ============================================================

-- 1) ¿En qué base de datos y con qué usuario estoy?
select current_database() as base_de_datos, current_user as usuario;

-- 2) ¿Cuántas filas hay realmente?
select 'Producto' as tabla, count(*) as filas from "Producto"
union all
select 'TipoProducto' as tabla, count(*) as filas from "TipoProducto";

-- 3) Productos que existen (aquí deben salir los 3 que ves)
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

-- 4) Tipos existentes
select id_tipo, nombre
from "TipoProducto"
order by id_tipo;

-- 5) ¿RLS está activo?
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where oid in ('"Producto"'::regclass, '"TipoProducto"'::regclass);

-- 6) Políticas existentes
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('Producto', 'TipoProducto')
order by tablename, policyname;

-- 7) Permisos de lectura del rol anon/authenticated
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('Producto', 'TipoProducto')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
