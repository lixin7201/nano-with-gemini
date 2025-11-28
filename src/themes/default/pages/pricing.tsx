import { Subscription } from '@/shared/models/subscription';
import { FAQ as FAQType } from '@/shared/types/blocks/landing';
import { Pricing as PricingType } from '@/shared/types/blocks/pricing';
import { FAQ, Pricing } from '@/themes/default/blocks';

export default async function PricingPage({
  locale,
  pricing,
  currentSubscription,
  faq,
}: {
  locale?: string;
  pricing: PricingType;
  currentSubscription?: Subscription;
  faq?: FAQType;
}) {
  return (
    <>
      <Pricing pricing={pricing} currentSubscription={currentSubscription} />
      {faq && <FAQ faq={faq} />}
    </>
  );
}
