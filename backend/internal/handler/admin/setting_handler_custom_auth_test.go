//go:build unit

package admin

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/handler/dto"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

func TestUpdateSettingsPreservesCustomAuthWithPartialPayloads(t *testing.T) {
	h, repo := newStepUpSwitchTestHandler(t, map[string]string{})
	for _, payload := range []map[string]any{
		{"account_login_enabled": true, "key_register_secret": "test-registration-secret"},
		{"site_name": "Updated Gateway"},
	} {
		rec := doUpdateSettings(t, h, payload, nil)
		require.Equal(t, http.StatusOK, rec.Code)
		require.Equal(t, "true", repo.values[service.SettingKeyAccountLoginEnabled])
		require.Equal(t, "test-registration-secret", repo.values[service.SettingKeyKeyRegisterSecret])
		var response struct {
			Data dto.SystemSettings `json:"data"`
		}
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
		require.True(t, response.Data.AccountLoginEnabled)
		require.True(t, response.Data.KeyRegisterSecretConfigured)
		require.NotContains(t, rec.Body.String(), "test-registration-secret")
	}

	rec := doUpdateSettings(t, h, map[string]any{"key_register_secret": ""}, nil)
	require.Equal(t, http.StatusOK, rec.Code)
	require.Empty(t, repo.values[service.SettingKeyKeyRegisterSecret])
	require.Equal(t, "true", repo.values[service.SettingKeyAccountLoginEnabled])
}
