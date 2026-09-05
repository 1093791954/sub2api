package migrations

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestUnlimitedUserConcurrencyMigrationCoversExistingAndFutureUsers(t *testing.T) {
	content, err := FS.ReadFile("194_unlimited_user_concurrency.sql")
	require.NoError(t, err)

	sql := string(content)
	require.Contains(t, sql, "ALTER TABLE users ALTER COLUMN concurrency SET DEFAULT 0")
	require.Contains(t, sql, "UPDATE users")
	require.Contains(t, sql, "SET concurrency = 0")
	require.Contains(t, sql, "'default_concurrency', '0'")
	require.Contains(t, sql, "'auth_source_default_email_concurrency', '0'")
	require.Contains(t, sql, "'auth_source_default_dingtalk_concurrency', '0'")
}
