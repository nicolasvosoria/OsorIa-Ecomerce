-- ============================================================
-- MIGRACIÓN SEGURA: public.clientes."NIT" numeric-like -> text
--
-- Objetivo:
--   - Preservar valores existentes con USING "NIT"::text
--   - Soportar NIT largo (ej: 8909006089)
--   - Soportar dígito de verificación (ej: 890900608-9)
--
-- Re-ejecutable / idempotente:
--   - Si tabla/columna no existen, informa con NOTICE y no rompe.
--   - Si ya es text/varchar, no vuelve a convertir.
--   - Si el tipo no es numeric-like, aborta con EXCEPTION clara para operadores.
-- ============================================================

DO $$
DECLARE
  v_data_type text;
  v_udt_name text;
  v_invalid_rows bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
  ) THEN
    RAISE NOTICE 'Tabla public.clientes no existe. Se omite la migración de NIT.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'NIT'
  ) THEN
    RAISE NOTICE 'Columna public.clientes."NIT" no existe. Se omite la migración.';
    RETURN;
  END IF;

  SELECT c.data_type, c.udt_name
  INTO v_data_type, v_udt_name
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'clientes'
    AND c.column_name = 'NIT';

  IF v_udt_name IN ('text', 'varchar', 'bpchar') THEN
    RAISE NOTICE 'public.clientes."NIT" already text/varchar (%). No se requiere conversión.', v_udt_name;
  ELSIF v_udt_name IN ('int2', 'int4', 'int8', 'numeric', 'float4', 'float8', 'oid') THEN
    EXECUTE 'ALTER TABLE public.clientes ALTER COLUMN "NIT" TYPE text USING "NIT"::text';
    RAISE NOTICE 'public.clientes."NIT" convertida de % (%) a text usando USING "NIT"::text.', v_data_type, v_udt_name;
  ELSE
    RAISE EXCEPTION 'Tipo no soportado para public.clientes."NIT": % (%). Migra manualmente de forma explícita.', v_data_type, v_udt_name;
  END IF;

  SELECT COUNT(*)
  INTO v_invalid_rows
  FROM public.clientes
  WHERE "NIT" IS NOT NULL
    AND btrim("NIT") <> ''
    AND btrim("NIT") !~ '^[0-9]+(-[0-9])?$';

  IF v_invalid_rows = 0 THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'ck_clientes_nit_basic_format'
        AND conrelid = 'public.clientes'::regclass
    ) THEN
      ALTER TABLE public.clientes
      ADD CONSTRAINT ck_clientes_nit_basic_format
      CHECK (
        "NIT" IS NULL
        OR btrim("NIT") = ''
        OR btrim("NIT") ~ '^[0-9]+(-[0-9])?$'
      );

      RAISE NOTICE 'Constraint ck_clientes_nit_basic_format creada para validar NIT (ej: 8909006089, 890900608-9).';
    ELSE
      RAISE NOTICE 'Constraint ck_clientes_nit_basic_format ya existe. Se mantiene.';
    END IF;
  ELSE
    RAISE NOTICE 'Se omite la constraint de formato NIT: hay % fila(s) con datos sucios.', v_invalid_rows;
  END IF;

  CREATE INDEX IF NOT EXISTS idx_clientes_nit_lookup
    ON public.clientes ("NIT");

  RAISE NOTICE 'Índice idx_clientes_nit_lookup verificado/creado para búsqueda textual segura de NIT.';
END $$;
