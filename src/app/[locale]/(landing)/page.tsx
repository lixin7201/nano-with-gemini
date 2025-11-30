import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { Landing } from '@/shared/types/blocks/landing';
import { getNanoBananaShowcaseItems } from '@/shared/adapters/nano-banana-prompts';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // load page data
  const t = await getTranslations('landing');

  // build page params
  const page: Landing = {
    hero: t.raw('hero'),
    logos: t.raw('logos'),
    introduce: t.raw('introduce'),
    benefits: t.raw('benefits'),
    usage: t.raw('usage'),
    features: t.raw('features'),
    stats: t.raw('stats'),
    subscribe: t.raw('subscribe'),
    showcase: t.raw('showcase'),
    faq: t.raw('faq'),
    cta: t.raw('cta'),
  };

  // Merge external showcase items
  const nbItems = getNanoBananaShowcaseItems(9);
  if (page.showcase) {
    page.showcase.items = [...(page.showcase.items || []), ...nbItems];
  }

  // load page component
  const Page = await getThemePage('landing');

  return <Page locale={locale} page={page} />;
}
