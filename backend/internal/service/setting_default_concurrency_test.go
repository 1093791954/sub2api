//go:build unit

package service

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

func TestSettingServiceGetDefaultConcurrencyAcceptsUnlimited(t *testing.T) {
	svc := NewSettingService(&settingRepoStub{values: map[string]string{
		SettingKeyDefaultConcurrency: "0",
	}}, &config.Config{Default: config.DefaultConfig{UserConcurrency: 5}})

	require.Equal(t, 0, svc.GetDefaultConcurrency(context.Background()))
}

func TestMergeProviderDefaultGrantSettingsAcceptsUnlimited(t *testing.T) {
	got := mergeProviderDefaultGrantSettings(
		ProviderDefaultGrantSettings{Concurrency: 5},
		ProviderDefaultGrantSettings{Concurrency: 0},
	)

	require.Equal(t, 0, got.Concurrency)
}
