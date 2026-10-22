package notify

import (
	"context"
	"errors"
	"fmt"
	"net/smtp"
	"strings"
)

// SMTPConfig configures SMTP email delivery for notifications.
type SMTPConfig struct {
	Host     string
	Port     uint64
	Username string
	Password string
	From     string
}

// SMTP sends plain-text emails over SMTP.
type SMTP struct {
	addr string
	auth smtp.Auth
	from string
}

// NewSMTP returns nil when SMTP is not configured.
func NewSMTP(cfg SMTPConfig) (*SMTP, error) {
	if cfg.Host == "" && cfg.From == "" {
		return nil, nil
	}
	if cfg.Host == "" || cfg.From == "" {
		return nil, errors.New("SMTP_HOST and SMTP_FROM must be set together")
	}
	if cfg.Port == 0 {
		return nil, errors.New("SMTP_PORT must be greater than 0")
	}
	m := &SMTP{
		addr: fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		from: cfg.From,
	}
	if cfg.Username != "" {
		m.auth = smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host)
	}
	return m, nil
}

// Send delivers one plain-text email.
func (s *SMTP) Send(_ context.Context, to, subject, body string) error {
	headers := []string{
		"From: " + s.from,
		"To: " + to,
		"Subject: " + encodeHeader(subject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
	}
	msg := strings.Join(headers, "\r\n") + "\r\n\r\n" + body
	return smtp.SendMail(s.addr, s.auth, s.from, []string{to}, []byte(msg))
}

func encodeHeader(v string) string {
	if strings.TrimSpace(v) == "" {
		return "Whitzard notification"
	}
	return v
}
