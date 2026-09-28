-- Passwords defined by the platform administrator are immediately usable.
-- Existing identities are released from the legacy first-login reset flow.
alter table public.login_identities
  alter column must_change_password set default false;

update public.login_identities
set must_change_password=false
where must_change_password;

