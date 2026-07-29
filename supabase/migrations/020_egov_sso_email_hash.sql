-- email becomes encrypted at rest alongside the rest of egov_sso_profiles'
-- identity data. Since AES-GCM's random IV means the same plaintext never
-- produces the same ciphertext twice, equality lookups (sign-in resolves by
-- email) can't query the ciphertext column directly. email_hash — a
-- deterministic HMAC of the normalized email, computed in application code
-- from PII_ENCRYPTION_KEY — is the lookup key instead.
--
-- Nullable rather than not-null: existing rows are backfilled by
-- scripts/backfill-encrypt-pii.ts after this migration runs, not by SQL here.
alter table public.egov_sso_profiles
add column if not exists email_hash text unique;
