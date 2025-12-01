import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { getMetadata } from '@/shared/lib/seo';
import {
  CTA as CTAType,
  Showcase as ShowcaseType,
} from '@/shared/types/blocks/landing';
import { getNanoBananaShowcaseItems } from '@/shared/adapters/nano-banana-prompts';

export const generateMetadata = getMetadata({
  metadataKey: 'showcases.metadata',
  canonicalUrl: '/showcases',
});

export default async function ShowcasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // load landing data
  const tl = await getTranslations('landing');

  // load showcases data
  const t = await getTranslations('showcases');

  // load page component
  const Page = await getThemePage('showcases');

  // build sections
  const showcase: ShowcaseType = t.raw('showcases');
  const cta: CTAType = tl.raw('cta');

  // Note: External showcase items disabled for compliance
  // They contain third-party AI brand names (Google, Gemini, ChatGPT)
  // which may violate AI Wrapper compliance requirements
  // const nbItems = getNanoBananaShowcaseItems();
  // if (showcase) {
  //   showcase.items = [...(showcase.items || []), ...nbItems];
  // }

  return <Page locale={locale} showcase={showcase} cta={cta} />;
}
