package service

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

type affiliateValidationRepoStub struct {
	AffiliateRepository
	summary      *AffiliateSummary
	err          error
	resolvedCode string
}

func (r *affiliateValidationRepoStub) GetAffiliateByCode(_ context.Context, code string) (*AffiliateSummary, error) {
	r.resolvedCode = code
	return r.summary, r.err
}

type affiliateValidationSettingRepoStub struct {
	SettingRepository
	enabled bool
}

func (r *affiliateValidationSettingRepoStub) GetValue(_ context.Context, key string) (string, error) {
	if key == SettingKeyAffiliateEnabled {
		if r.enabled {
			return "true", nil
		}
		return "false", nil
	}
	return "", ErrSettingNotFound
}

func newAffiliateValidationService(repo AffiliateRepository, enabled bool) *AffiliateService {
	settings := NewSettingService(&affiliateValidationSettingRepoStub{enabled: enabled}, nil)
	return NewAffiliateService(repo, settings, nil, nil)
}

func TestValidateAffiliateCode(t *testing.T) {
	t.Parallel()
	ctx := context.Background()

	t.Run("normalizes and accepts an existing code", func(t *testing.T) {
		repo := &affiliateValidationRepoStub{summary: &AffiliateSummary{UserID: 42}}
		svc := newAffiliateValidationService(repo, true)

		require.NoError(t, svc.ValidateAffiliateCode(ctx, "  vip_2026 "))
		require.Equal(t, "VIP_2026", repo.resolvedCode)
	})

	t.Run("rejects invalid format without repository lookup", func(t *testing.T) {
		repo := &affiliateValidationRepoStub{}
		svc := newAffiliateValidationService(repo, true)

		require.ErrorIs(t, svc.ValidateAffiliateCode(ctx, "bad code"), ErrAffiliateCodeInvalid)
		require.Empty(t, repo.resolvedCode)
	})

	t.Run("maps unknown code to the public invalid error", func(t *testing.T) {
		repo := &affiliateValidationRepoStub{err: ErrAffiliateProfileNotFound}
		svc := newAffiliateValidationService(repo, true)

		require.ErrorIs(t, svc.ValidateAffiliateCode(ctx, "MISSING"), ErrAffiliateCodeInvalid)
	})

	t.Run("rejects validation while affiliate feature is disabled", func(t *testing.T) {
		repo := &affiliateValidationRepoStub{summary: &AffiliateSummary{UserID: 42}}
		svc := newAffiliateValidationService(repo, false)

		require.ErrorIs(t, svc.ValidateAffiliateCode(ctx, "VIP2026"), ErrAffiliateDisabled)
		require.Empty(t, repo.resolvedCode)
	})

	t.Run("preserves unexpected repository errors", func(t *testing.T) {
		lookupErr := errors.New("lookup unavailable")
		repo := &affiliateValidationRepoStub{err: lookupErr}
		svc := newAffiliateValidationService(repo, true)

		require.ErrorIs(t, svc.ValidateAffiliateCode(ctx, "VIP2026"), lookupErr)
	})
}
