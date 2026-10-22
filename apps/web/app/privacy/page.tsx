import type { Metadata } from 'next';
import { ContactLink, LEGAL_OPERATOR, LegalList, LegalPage, LegalSection } from '../legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy · BotDock',
  description: 'What data BotDock collects, why, and the choices you have.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          BotDock is a beta service run by {LEGAL_OPERATOR}, an individual developer (not a
          registered company). This policy explains what data BotDock handles when you use the
          dashboard, and when visitors chat with a bot you have embedded on your site. Questions or
          requests: <ContactLink />.
        </p>
      }
    >
      <LegalSection title="Data we collect about you">
        <LegalList
          items={[
            <>
              <strong className="text-foreground">Account details</strong> from Google or GitHub
              when you sign in: your name, email address and profile picture URL.
            </>,
            <>
              <strong className="text-foreground">Workspace content</strong> you create: bot
              settings and instructions, knowledge sources you upload (files and text), allowed
              domains, and any note you add when requesting more bots.
            </>,
            <>
              <strong className="text-foreground">Model provider API keys</strong> you connect. They
              are encrypted at rest (AES-256-GCM) and only used to call that provider on your
              behalf.
            </>,
            <>
              <strong className="text-foreground">Usage records</strong> per message: model, token
              counts, latency and estimated cost, so you can see what your bots cost you.
            </>,
            <>
              <strong className="text-foreground">Analytics</strong>: the BotDock website uses
              Google Analytics to understand which pages are used. It sets Google Analytics cookies
              in your browser.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Data about visitors to your embedded bot">
        <p>
          When someone chats with a bot you embedded, BotDock stores the conversation (their
          messages, the bot&apos;s answers and the sources it cited) so you can review it in your
          dashboard. The widget keeps a conversation ID in the visitor&apos;s browser storage so the
          chat continues across page loads. Visitor IP addresses are only used in short-lived
          rate-limit counters to stop abuse; they are not saved with the conversation.
        </p>
        <p>
          For this data you decide what is collected and why, so you are responsible for telling
          your visitors about it (for example in your own privacy policy). BotDock processes it on
          your behalf.
        </p>
      </LegalSection>

      <LegalSection title="How the data is used">
        <LegalList
          items={[
            'To sign you in and keep your session active.',
            'To run your bots: your knowledge sources and visitor messages are sent to the AI model provider whose key you connected (for example OpenAI), under that provider’s terms, to create embeddings and answers.',
            'To show you conversations, usage and costs in the dashboard.',
            'To enforce plan limits and measure interest in paid plans.',
            'To keep the service secure and to fix problems.',
          ]}
        />
        <p>BotDock does not sell your data or use it for advertising.</p>
      </LegalSection>

      <LegalSection title="Who else handles it">
        <p>
          BotDock runs on third-party infrastructure: web hosting (Vercel), a server for the API
          (DigitalOcean), a managed database, and file storage. Sign-in goes through Google or
          GitHub. Model calls go to the provider you connect. Google provides analytics. Each of
          these only receives what it needs to do its job.
        </p>
      </LegalSection>

      <LegalSection title="How long it is kept">
        <p>
          Your account and workspace data are kept while you use BotDock. Ask for deletion at any
          time and your account, workspaces, bots, knowledge sources, conversations and stored keys
          will be deleted, except where the law requires keeping something.
        </p>
      </LegalSection>

      <LegalSection title="Your choices and rights">
        <p>
          You can ask for a copy of your data, ask for it to be corrected or deleted, or object to
          how it is used, by emailing <ContactLink />. You can block analytics cookies in your
          browser settings. If you are in the EU or UK, you can also complain to your local data
          protection authority.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          BotDock is not meant for anyone under 16, and we don&apos;t knowingly collect their data.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          BotDock is in beta and this policy may change as the product does. The date at the top
          shows the latest version; significant changes will be announced in the dashboard or by
          email.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
