import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { getMetadata } from '@/shared/lib/seo';
import {
  CTA as CTAType,
  Showcase as ShowcaseType,
} from '@/shared/types/blocks/landing';
import { getNanoBananaShowcaseItems } from '@/shared/adapters/nano-banana-prompts';
import { getShowcases } from '@/shared/models/showcase';

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

  // Get static showcase items from JSON file (original data)
  const staticItems = getNanoBananaShowcaseItems(undefined, locale);
  if (showcase) {
    showcase.items = [...(showcase.items || []), ...staticItems];
  }

  // Fetch dynamic showcases from database (user shared / admin added)
  const { items: dbItems } = await getShowcases({ limit: 100 });

  // Convert database items to ShowcaseItem format and prepend them
  // (database items show first, then static items)
  const dynamicItems = dbItems.map((item) => ({
    title: item.title || item.prompt.slice(0, 24) + '...',
    prompt: item.prompt,
    image: {
      src: item.image,
      alt: item.title || 'Showcase image',
    },
  }));

  if (showcase) {
    // De-duplicate static items that also exist in dynamic (by image src)
    const seen = new Set(dynamicItems.map(i => i.image?.src).filter(Boolean));
    const existing = showcase.items || [];
    const filteredStatic = existing.filter(i => !i.image?.src || !seen.has(i.image.src));
    showcase.items = dynamicItems.length > 0 ? [...dynamicItems, ...filteredStatic] : filteredStatic;
  }

  return <Page locale={locale} showcase={showcase} cta={cta} />;
}
