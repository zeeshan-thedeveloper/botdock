import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactLink, LEGAL_OPERATOR, LegalList, LegalPage, LegalSection } from '../legal-page';

export const metadata: Metadata = {
  title: 'Terms of Service · BotDock',
  description: 'The terms for using the BotDock beta.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These terms cover your use of BotDock, a beta service run by {LEGAL_OPERATOR}, an
          individual developer (not a registered company). By signing in you agree to them.
          Questions: <ContactLink />.
        </p>
      }
    >
      <LegalSection title="Beta service">
        <p>
          BotDock is in beta. Features may change or be removed, there may be bugs or downtime, and
          data could be lost. It is provided &quot;as is&quot;, without warranties of any kind. Keep
          your own copies of anything important, such as your knowledge source files.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <LegalList
          items={[
            'You sign in with Google or GitHub and are responsible for activity in your account.',
            'You must be at least 16, and old enough to agree to these terms where you live.',
            'If you use BotDock for an organisation, you confirm you can accept these terms for it.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Your API keys and costs">
        <p>
          BotDock uses the model provider key you connect (for example OpenAI) to answer chats and
          process knowledge. Every call is billed to your provider account, and you must follow that
          provider&apos;s terms. Use allowed domains to control where your widget works; you are
          responsible for costs from your own bots.
        </p>
      </LegalSection>

      <LegalSection title="Plans and limits">
        <p>
          The Free plan includes 2 bots per workspace. A paid plan with more bots is planned but not
          yet on sale; requesting more bots doesn&apos;t commit you to paying anything. Limits may
          change during the beta, and you will be told before any paid plan affects you.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You keep ownership of the content you add (bot instructions, knowledge sources) and of
          your bots&apos; conversations. You give BotDock permission to store and process it only to
          run the service for you. You confirm you have the right to upload it and to collect your
          visitors&apos; messages, and that you tell visitors how their data is used. See the{' '}
          <Link
            href="/privacy"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>Don&apos;t use BotDock to:</p>
        <LegalList
          items={[
            'break the law or infringe anyone’s rights;',
            'deceive people, for example by having a bot pretend to be a human or a different organisation;',
            'collect sensitive personal data you have no right to process;',
            'send spam, malware or harmful content;',
            'attack, overload or try to get around BotDock’s security, rate limits or plan limits.',
          ]}
        />
        <p>Accounts or bots that break these rules may be suspended.</p>
      </LegalSection>

      <LegalSection title="AI answers">
        <p>
          Bots generate answers with AI models and can be wrong, incomplete or out of date. You are
          responsible for how your bots are configured and for reviewing anything important before
          relying on it.
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>
          To the extent the law allows, BotDock and its operator are not liable for indirect or
          consequential losses, lost profits or lost data, or for charges from your model provider.
          While BotDock is free, total liability for any claim is limited to the amount you paid for
          the service in the 12 months before it (currently nothing).
        </p>
      </LegalSection>

      <LegalSection title="Ending your use">
        <p>
          You can stop using BotDock at any time and ask for your data to be deleted. BotDock may
          suspend or close accounts that break these terms, or end the beta, with reasonable notice
          where possible.
        </p>
      </LegalSection>

      <LegalSection title="Changes and governing law">
        <p>
          These terms may be updated during the beta; the date at the top shows the latest version,
          and continuing to use BotDock means you accept it. These terms are governed by the laws of
          Pakistan.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
