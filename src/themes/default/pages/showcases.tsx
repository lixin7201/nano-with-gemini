import {
  CTA as CTAType,
  Showcase as ShowcaseType,
} from '@/shared/types/blocks/landing';
import { CTA, Showcase } from '@/themes/default/blocks';

export default async function ShowcasesPage({
  locale,
  showcase,
  cta,
}: {
  locale?: string;
  showcase: ShowcaseType;
  cta?: CTAType;
}) {
  return (
    <>
      <Showcase showcase={showcase} />
      {cta && <CTA cta={cta} className="bg-muted" />}
    </>
  );
}
