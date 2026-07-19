ALTER TABLE "bots"
  ADD COLUMN "initials" TEXT,
  ADD COLUMN "welcomeMessage" TEXT NOT NULL DEFAULT 'Hi! I''m here to help with orders, returns, and account questions.',
  ADD COLUMN "instructions" TEXT NOT NULL DEFAULT 'You are a customer support assistant for this account.
Answer only using the provided knowledge sources.
Be concise, friendly, and professional.
If policy details conflict, prefer the most recent source.
Escalate billing disputes, account access issues, and refund exceptions.',
  ADD COLUMN "tone" TEXT NOT NULL DEFAULT 'Friendly, precise, and calm',
  ADD COLUMN "handoffBehavior" TEXT NOT NULL DEFAULT 'Escalate after low-confidence answer',
  ADD COLUMN "widgetTheme" TEXT NOT NULL DEFAULT 'Dark system default',
  ADD COLUMN "widgetPosition" TEXT NOT NULL DEFAULT 'Bottom right',
  ADD COLUMN "strictKnowledge" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "promptInjectionProtection" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "piiRedaction" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "collectFeedback" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "humanHandoff" BOOLEAN NOT NULL DEFAULT true;
