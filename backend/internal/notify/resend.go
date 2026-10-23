package notify

import (
	"context"
	"fmt"

	"github.com/resend/resend-go/v4"
)

// ResendConfig configures email delivery via the Resend API.
type ResendConfig struct {
	APIKey string // RESEND_API_KEY
	From   string // RESEND_FROM, e.g. "Whitzard <noreply@yourdomain.com>"
}

// Resend sends emails through the Resend API.
type Resend struct {
	client *resend.Client
	from   string
}

// NewResend returns nil when Resend is not configured (both APIKey and From are empty).
func NewResend(cfg ResendConfig) (*Resend, error) {
	if cfg.APIKey == "" && cfg.From == "" {
		return nil, nil
	}
	if cfg.APIKey == "" || cfg.From == "" {
		return nil, fmt.Errorf("RESEND_API_KEY and RESEND_FROM must be set together")
	}
	return &Resend{
		client: resend.NewClient(cfg.APIKey),
		from:   cfg.From,
	}, nil
}

// Send delivers one plain-text email via the Resend API.
func (r *Resend) Send(_ context.Context, to, subject, body string) error {
	if subject == "" {
		subject = "Whitzard notification"
	}
	params := &resend.SendEmailRequest{
		From:    r.from,
		To:      []string{to},
		Subject: subject,
		Text:    body,
	}
	_, err := r.client.Emails.Send(params)
	return err
}
