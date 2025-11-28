import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageHeader } from '@/shared/blocks/common';
import { ImageGenerator } from '@/shared/blocks/generator';
import { getMetadata } from '@/shared/lib/seo';
import { CTA, FAQ } from '@/themes/default/blocks';

export const generateMetadata = getMetadata({
  metadataKey: 'ai.image.metadata',
  canonicalUrl: '/ai-image-generator',
});

export default async function AiImageGeneratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const { prompt } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('landing');
  const tt = await getTranslations('ai.image');

  return (
    <>
      <PageHeader
        title={tt.raw('page.title')}
        description={tt.raw('page.description')}
        className="mt-16 -mb-32"
      />
      <ImageGenerator
        srOnlyTitle={tt.raw('generator.title')}
        initialPrompt={typeof prompt === 'string' ? prompt : undefined}
      />
      <FAQ faq={t.raw('faq')} />
      <CTA cta={t.raw('cta')} className="bg-muted" />
    </>
  );
}
