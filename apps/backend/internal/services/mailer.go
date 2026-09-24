package services

import (
	"context"
	"fmt"
	"net/smtp"
	"strings"

	"github.com/resend/resend-go/v2"

	"github.com/tdvorak/primora/apps/backend/internal/config"
)

// Mailer is transport-only: Resend when configured, plain SMTP otherwise.
// Templates render (subject, body) from data; sends are logged to
// core.email_log by the service layer so operators can see what went out.
type Mailer struct {
	cfg    config.Config
	resend *resend.Client
}

func NewMailer(cfg config.Config) *Mailer {
	var resendClient *resend.Client
	if cfg.ResendAPIKey != "" {
		resendClient = resend.NewClient(cfg.ResendAPIKey)
	}
	return &Mailer{cfg: cfg, resend: resendClient}
}

// mailTemplate renders a subject + plaintext body from template data.
type mailTemplate func(data map[string]string) (subject string, body string)

var mailTemplates = map[string]mailTemplate{
	"invitation": func(d map[string]string) (string, string) {
		subject := fmt.Sprintf("You were invited to %s on Primora", d["organization"])
		body := fmt.Sprintf(
			"You have been invited to Primora.\n\nOpen this link to accept the invitation:\n%s\n\nThis link expires in 72 hours.\n",
			d["invite_url"],
		)
		return subject, body
	},
}

func renderMailTemplate(template string, data map[string]string) (string, string, error) {
	tpl, ok := mailTemplates[template]
	if !ok {
		return "", "", fmt.Errorf("unknown email template %q", template)
	}
	subject, body := tpl(data)
	return subject, body, nil
}

func (m *Mailer) Send(ctx context.Context, toEmail, subject, text string) error {
	if m.resend != nil {
		_, err := m.resend.Emails.SendWithContext(ctx, &resend.SendEmailRequest{
			From:    m.cfg.MailFrom,
			To:      []string{toEmail},
			Subject: subject,
			Text:    text,
		})
		return err
	}
	address := fmt.Sprintf("%s:%d", m.cfg.SMTPHost, m.cfg.SMTPPort)
	message := strings.Join([]string{
		"From: " + m.cfg.MailFrom,
		"To: " + toEmail,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=utf-8",
		"",
		text,
	}, "\r\n")
	var auth smtp.Auth
	if m.cfg.SMTPUser != "" {
		auth = smtp.PlainAuth("", m.cfg.SMTPUser, m.cfg.SMTPPassword, m.cfg.SMTPHost)
	}
	return smtp.SendMail(address, auth, extractEmail(m.cfg.MailFrom), []string{toEmail}, []byte(message))
}

func extractEmail(input string) string {
	if start := strings.Index(input, "<"); start >= 0 {
		if end := strings.Index(input, ">"); end > start {
			return input[start+1 : end]
		}
	}
	return input
}
