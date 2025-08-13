'use client';

import { Section, Cell, Image, List } from '@telegram-apps/telegram-ui';
import { useTranslations } from 'next-intl';

import { Link } from '@/components/Link/Link';
import { LocaleSwitcher } from '@/components/LocaleSwitcher/LocaleSwitcher';
import { Page } from '@/components/Page';

export default function Home() {
  const t = useTranslations('i18n');

  return (
    <Page back={false}>
      <List>
        <Section
          header="RC4ttendance Bot"
          footer="Log your attendance or make your own event"
        >
        </Section>
        <Section
          header="Create your own event"
          footer="Done by Gian Sen, Raihan, Cavan, Guanlin, Jin Yuan"
        >         
        <Link href="/create-poll">
            <Cell subtitle="Create your poll for your IG!">
              Create Poll
            </Cell>
          </Link>
          <Link href="/user-profile">
            <Cell subtitle="Check which groups you have admin for">
              User Profile
            </Cell>
          </Link>
        </Section>
        <Section header={t('header')} footer={t('footer')}>
          <LocaleSwitcher />
        </Section>
      </List>
    </Page>
  );
}
