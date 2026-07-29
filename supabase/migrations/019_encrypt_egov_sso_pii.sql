-- Application-level encryption stores ciphertext as text, so the columns that
-- were date/jsonb need to become text to hold it. The actual re-encryption of
-- existing rows happens in application code (lib/security/pii-crypto.ts),
-- since the key must never be available to Postgres itself.
alter table public.egov_sso_profiles
  alter column birth_date type text using birth_date::text,
  alter column passport type text using passport::text,
  alter column national_id type text using national_id::text,
  alter column additional_information type text using additional_information::text,
  alter column raw_payload type text using raw_payload::text;
