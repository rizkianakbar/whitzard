package notify_test

import (
	"testing"

	"github.com/rizkianakbar/whitzard/backend/internal/notify"
)

func TestNewResend(t *testing.T) {
	if m, err := notify.NewResend(notify.ResendConfig{}); m != nil || err != nil {
		t.Fatalf("unconfigured = %v, %v; want nil, nil", m, err)
	}
	if _, err := notify.NewResend(notify.ResendConfig{APIKey: "re_test"}); err == nil {
		t.Fatal("RESEND_API_KEY without RESEND_FROM must be refused")
	}
	if _, err := notify.NewResend(notify.ResendConfig{From: "Whitzard <noreply@example.com>"}); err == nil {
		t.Fatal("RESEND_FROM without RESEND_API_KEY must be refused")
	}
	if m, err := notify.NewResend(notify.ResendConfig{APIKey: "re_test", From: "noreply@example.com"}); m == nil || err != nil {
		t.Fatalf("configured = %v, %v", m, err)
	}
}
