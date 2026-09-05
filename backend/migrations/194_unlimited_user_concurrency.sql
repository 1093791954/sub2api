-- User concurrency uses 0 as the unlimited sentinel throughout the gateway.
-- Apply the unlimited policy to both existing users and every registration path.
ALTER TABLE users ALTER COLUMN concurrency SET DEFAULT 0;

UPDATE users
SET concurrency = 0,
    updated_at = NOW()
WHERE concurrency <> 0;

INSERT INTO settings (key, value)
VALUES
    ('default_concurrency', '0'),
    ('auth_source_default_email_concurrency', '0'),
    ('auth_source_default_linuxdo_concurrency', '0'),
    ('auth_source_default_oidc_concurrency', '0'),
    ('auth_source_default_wechat_concurrency', '0'),
    ('auth_source_default_github_concurrency', '0'),
    ('auth_source_default_google_concurrency', '0'),
    ('auth_source_default_dingtalk_concurrency', '0')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
