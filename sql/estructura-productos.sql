-- ============================================================
-- ESTRUCTURA REAL · PRODUCTOS
-- Supabase → SQL Editor → New query → pega TODO y Run.
-- Copia y pega el resultado completo de cada consulta.
-- ============================================================

-- 1) Columnas de las tablas relacionadas con el catálogo
select
    table_name,
    ordinal_position,
    column_name,
    data_type,
    is_nullable,
    column_default
from information_schema.columns
where table_schema = 'public'
  and (
    table_name ilike '%producto%'
    or table_name ilike '%variante%'
    or table_name ilike '%imagen%'
    or table_name ilike '%color%'
    or table_name ilike '%talla%'
    or table_name ilike '%categoria%'
  )
order by table_name, ordinal_position;

-- 2) Llaves foráneas (para saber cómo se unen las tablas)
select
    tc.table_name,
    kcu.column_name,
    ccu.table_name  as tabla_referenciada,
    ccu.column_name as columna_referenciada
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
order by tc.table_name, kcu.column_name;

-- 3) Todas las tablas de public (para ver si hay más tablas de catálogo)
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;

-- 4) Datos actuales de tipos y variantes
select * from "TipoProducto" order by id_tipo;
select * from "VarianteProducto" order by 1 limit 20;
