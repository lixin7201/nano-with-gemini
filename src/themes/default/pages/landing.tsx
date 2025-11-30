import { Landing } from '@/shared/types/blocks/landing';
import {
  CTA,
  FAQ,
  Features,
  FeaturesAccordion,
  FeaturesList,
  FeaturesStep,
  Hero,
  Logos,
  Showcase,
  Stats,
  Subscribe,
} from '@/themes/default/blocks';

export default async function LandingPage({
  locale,
  page,
}: {
  locale?: string;
  page: Landing;
}) {
  return (
    <>
      {page.hero && <Hero hero={page.hero} />}

      {page.introduce && <FeaturesList features={page.introduce} />}
      {page.benefits && <FeaturesAccordion features={page.benefits} />}
      {page.usage && <FeaturesStep features={page.usage} />}
      {page.features && <Features features={page.features} />}
      {page.stats && <Stats stats={page.stats} className="bg-muted" />}
      {page.showcase && <Showcase showcase={page.showcase} />}
      {page.subscribe && (
        <Subscribe subscribe={page.subscribe} className="bg-muted" />
      )}
      {page.faq && <FAQ faq={page.faq} />}
      {page.cta && <CTA cta={page.cta} className="bg-muted" />}
    </>
  );
}
