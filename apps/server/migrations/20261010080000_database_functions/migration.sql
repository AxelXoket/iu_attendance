SET LOCAL lock_timeout = '3s';
--> statement-breakpoint
SET LOCAL statement_timeout = '60s';
--> statement-breakpoint
-- Shared SQL functions of the database module (D12-P01). The setup step (D12-P07) creates
-- the app schema and the roles first; before it this migration stops with 3F000 and leaves
-- nothing behind. Every function belongs to attendance_migration and runs as SECURITY DEFINER
-- with a fixed search_path; PUBLIC loses EXECUTE and the application roles get it. That grant
-- matters for the generation functions only: a trigger fires for every role that writes the
-- table, EXECUTE or not, and a trigger function cannot be called directly (0A000).
--
-- Generic BEFORE UPDATE FOR EACH ROW trigger: the trigger arguments name the columns that
-- may not change (D12-B13). A change raises 23000 with the trigger name as CONSTRAINT and
-- the column as COLUMN; the message carries names only, never a value. Binding it any other
-- way, or naming no column or a missing column, fails each time the trigger fires (39P01,
-- 42703). Each column is compared by its text form, byte for byte: types without an equality
-- operator work, and json key order or array bounds count as changes; so does rewriting
-- a value in another spelling of the same value (numeric 1.0 as 1.00). DateStyle and
-- extra_float_digits are fixed so the caller's session cannot print two values alike.
CREATE FUNCTION app.database_immutable_column()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
SET DateStyle = 'ISO, YMD'
SET extra_float_digits = 1
AS $function$
DECLARE
  checked_column text;
  changed boolean;
BEGIN
  IF TG_WHEN <> 'BEFORE' OR TG_LEVEL <> 'ROW' OR TG_OP <> 'UPDATE' THEN
    RAISE EXCEPTION 'trigger % on %.% must run BEFORE UPDATE FOR EACH ROW',
      TG_NAME, TG_TABLE_SCHEMA, TG_TABLE_NAME
      USING ERRCODE = 'trigger_protocol_violated';
  END IF;
  IF TG_NARGS = 0 THEN
    RAISE EXCEPTION 'trigger % on %.% names no column', TG_NAME, TG_TABLE_SCHEMA, TG_TABLE_NAME
      USING ERRCODE = 'trigger_protocol_violated';
  END IF;
  -- Every name is checked before any value, so a wrong binding fails whatever the row holds.
  FOREACH checked_column IN ARRAY TG_ARGV LOOP
    IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_attribute
      WHERE attrelid = TG_RELID AND attname = checked_column AND attnum > 0 AND NOT attisdropped
    ) THEN
      RAISE EXCEPTION 'trigger % names column % that %.% does not have',
        TG_NAME, checked_column, TG_TABLE_SCHEMA, TG_TABLE_NAME
        USING ERRCODE = 'undefined_column';
    END IF;
  END LOOP;
  FOREACH checked_column IN ARRAY TG_ARGV LOOP
    EXECUTE pg_catalog.format(
      'SELECT ($1).%1$I::text COLLATE "C" IS DISTINCT FROM ($2).%1$I::text COLLATE "C"',
      checked_column
    ) INTO changed USING OLD, NEW;
    IF changed THEN
      RAISE EXCEPTION 'column % of %.% cannot change', checked_column, TG_TABLE_SCHEMA, TG_TABLE_NAME
        USING ERRCODE = 'integrity_constraint_violation',
          CONSTRAINT = TG_NAME,
          SCHEMA = TG_TABLE_SCHEMA,
          TABLE = TG_TABLE_NAME,
          COLUMN = checked_column;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$function$;
--> statement-breakpoint
ALTER FUNCTION app.database_immutable_column() OWNER TO attendance_migration;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.database_immutable_column() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.database_immutable_column() TO attendance_api, attendance_worker;
--> statement-breakpoint
-- Generation, first source: the cluster's system identifier and the timeline of the control
-- file's last checkpoint (D12-B32). The generation reader (D12-P04) cross-checks the timeline
-- with the WAL file name below and joins the two values as '<system>.<timeline>'. The
-- identifier is text so no driver parser can round the 64-bit value.
CREATE FUNCTION app.database_generation_control_file(
  OUT system_identifier text,
  OUT timeline_id integer
)
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
  SELECT control_system.system_identifier::text, control_checkpoint.timeline_id
  FROM pg_catalog.pg_control_system() AS control_system
  CROSS JOIN pg_catalog.pg_control_checkpoint() AS control_checkpoint
$function$;
--> statement-breakpoint
ALTER FUNCTION app.database_generation_control_file() OWNER TO attendance_migration;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.database_generation_control_file() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.database_generation_control_file() TO attendance_api, attendance_worker;
--> statement-breakpoint
-- Generation, second source: the name of the current WAL file, whose first 8 hex digits are
-- the timeline the server writes on right after a promotion. Primary only: the function
-- fails during recovery.
CREATE FUNCTION app.database_generation_wal_file()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
  SELECT pg_catalog.pg_walfile_name(pg_catalog.pg_current_wal_lsn())
$function$;
--> statement-breakpoint
ALTER FUNCTION app.database_generation_wal_file() OWNER TO attendance_migration;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.database_generation_wal_file() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.database_generation_wal_file() TO attendance_api, attendance_worker;
