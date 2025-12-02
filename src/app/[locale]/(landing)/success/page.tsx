import { getTranslations } from 'next-intl/server';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { ConfettiPlaceholder } from '@/shared/components/effects/ConfettiPlaceholder';

export default async function SuccessPage() {
  const t = await getTranslations('settings.billing');

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-10">
      <ConfettiPlaceholder />
      
      <Card className="w-full max-w-md text-center border-none shadow-lg bg-background/60 backdrop-blur-sm">
        <CardHeader className="flex flex-col items-center space-y-4 pb-2">
          <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('success.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            {t('success.description')}
          </p>
          
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild variant="default" className="w-full sm:w-auto">
              <Link href="/settings/billing">
                {t('success.buttons.view_billing')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/">
                {t('success.buttons.go_home')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
