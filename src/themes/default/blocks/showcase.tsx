'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/core/i18n/navigation';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { Image as ImageType } from '@/shared/types/blocks/common';
import { Showcase as ShowcaseType } from '@/shared/types/blocks/landing';
import { Copy, Sparkles, Search, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { ShareDialog } from '@/shared/blocks/showcase/share-dialog';
import { useAppContext } from '@/shared/contexts/app';

export function Showcase({
  showcase,
  className,
}: {
  showcase: ShowcaseType;
  className?: string;
}) {
  const t = useTranslations('showcases');
  const { user, setIsShowSignModal } = useAppContext();
  const [keyword, setKeyword] = useState('');
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  // Filter items based on keyword
  const filteredItems = useMemo(() => {
    if (!keyword.trim()) return showcase.items || [];
    const searchTerm = keyword.toLowerCase();
    return (showcase.items || []).filter((item) => {
      const title = item.title?.toLowerCase() || '';
      const prompt = item.prompt?.toLowerCase() || '';
      return title.includes(searchTerm) || prompt.includes(searchTerm);
    });
  }, [showcase.items, keyword]);

  const handleAddClick = () => {
    if (!user) {
      setIsShowSignModal(true);
    } else {
      setIsShareDialogOpen(true);
    }
  };

  const ShowcaseCard = ({
    title,
    image,
    prompt,
  }: {
    title?: string;
    image?: ImageType;
    prompt?: string;
  }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      if (prompt) {
        navigator.clipboard.writeText(prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    const rawSrc = image?.src || '';
    const isUnsplash = rawSrc.includes('images.unsplash.com');
    const gridSrc = isUnsplash
      ? `${rawSrc}${rawSrc.includes('?') ? '&' : '?'}w=600&h=336&fit=crop&q=80&auto=format`
      : rawSrc;
    const fullSrc = isUnsplash
      ? `${rawSrc}${rawSrc.includes('?') ? '&' : '?'}w=1920&q=90&auto=format`
      : rawSrc;

    return (
      <div className="bg-card/25 ring-foreground/[0.07] flex flex-col overflow-hidden rounded-(--radius) border border-transparent ring-1">
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="relative aspect-video w-full overflow-hidden"
            >
              <img
                src={gridSrc}
                alt={image?.alt ?? title ?? 'Showcase image'}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                loading="lazy"
              />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl overflow-hidden p-0">
            <DialogTitle className="sr-only">
              {title ?? 'Showcase image'}
            </DialogTitle>
            <img
              src={fullSrc}
              alt={image?.alt ?? title ?? 'Showcase image'}
              className="h-auto w-full object-contain"
            />
          </DialogContent>
        </Dialog>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          <div className="relative flex-1">
            <Link
              href={`/ai-image-generator?prompt=${encodeURIComponent(prompt || '')}`}
              className="text-primary/90 hover:text-primary text-sm line-clamp-2 break-words underline-offset-2 hover:underline"
              aria-label="Use this prompt to generate"
            >
              {prompt}
            </Link>
          </div>
          <button
            onClick={handleCopy}
            className="text-primary hover:text-primary/80 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Copy className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy Prompt'}
          </button>
          <Link
            href={`/ai-image-generator?prompt=${encodeURIComponent(prompt || '')}`}
            className="text-primary hover:text-primary/80 hidden sm:flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Generate
          </Link>
        </div>
      </div>
    );
  };

  return (
    <section
      id={showcase.id}
      className={`py-10 md:py-14 ${showcase.className || ''} ${className || ''}`}
    >
      <div className="container">
        <ScrollAnimation>
          <div className="mx-auto max-w-2xl text-center text-balance">
            <h2 className="text-foreground mb-3 text-3xl font-semibold tracking-tight md:text-4xl">
              {showcase.title}
            </h2>
            <p className="text-muted-foreground mb-4 md:mb-6 lg:mb-8">
              {showcase.description}
            </p>
          </div>
        </ScrollAnimation>

        {/* Search and Share */}
        <ScrollAnimation delay={0.1}>
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('search.placeholder')}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleAddClick}>
              <Plus className="mr-2 h-4 w-4" />
              {t('share.button')}
            </Button>
          </div>
        </ScrollAnimation>

        <ScrollAnimation delay={0.2}>
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {t('search.no_results')}
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {filteredItems.map((item, index) => (
                <ShowcaseCard key={index} {...item} />
              ))}
            </div>
          )}
        </ScrollAnimation>
      </div>

      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
      />
    </section>
  );
}
