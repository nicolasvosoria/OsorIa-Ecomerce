-- An owner invited from the platform console is minted with a strong temporary
-- password (admin.createUser), never an invite link: the shared Supabase
-- project's Site URL redirects to another app (copaosoria), so generateLink /
-- inviteUserByEmail land the owner in the wrong product. This flag marks that
-- minted identity so the admin forces a password change on first entry; it stays
-- false for anyone who set their own password (normal sign-up, existing account).

alter table ecommerce.user_profiles
  add column must_change_password boolean not null default false;

comment on column ecommerce.user_profiles.must_change_password is
  'true para un dueño creado con contraseña temporal desde la consola: el admin del ecommerce lo obliga a cambiarla en su primer acceso a /admin. false para quien fijó su propia contraseña (registro normal o cuenta preexistente).';
