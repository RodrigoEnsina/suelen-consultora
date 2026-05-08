
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Só cria se ainda não existir
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@coonecta.com') THEN
    new_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'admin@coonecta.com',
      crypt('Admin@2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Super Administrador"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', 'admin@coonecta.com', 'email_verified', true),
      'email',
      new_user_id::text,
      now(), now(), now()
    );

    INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
