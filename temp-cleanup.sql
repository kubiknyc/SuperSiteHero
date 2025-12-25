
    -- Disable RLS temporarily
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', r.tablename);
      END LOOP;
    END $$;

    -- Delete from auth tables
    DELETE FROM auth.refresh_tokens;
    DELETE FROM auth.sessions;
    DELETE FROM auth.identities;
    DELETE FROM auth.mfa_factors;
    DELETE FROM auth.mfa_challenges;
    DELETE FROM auth.users;

    -- Truncate all public tables
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN (
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename != 'schema_migrations'
      ) LOOP
        BEGIN
          EXECUTE format('TRUNCATE TABLE public.%I CASCADE;', r.tablename);
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END LOOP;
    END $$;

    -- Clean storage
    DELETE FROM storage.objects;

    -- Re-enable RLS
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
      END LOOP;
    END $$;
  