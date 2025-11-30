'use client';

import { Link } from '@/core/i18n/navigation';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { Image as ImageType } from '@/shared/types/blocks/common';
import { Showcase as ShowcaseType } from '@/shared/types/blocks/landing';
import { Copy, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/shared/components/ui/dialog';

export function Showcase({
  showcase,
  className,
}: {
  showcase: ShowcaseType;
  className?: string;
}) {
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
        <div className="flex flex-1 flex-col gap-4 p-6">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          <div className="relative flex-1">
            <Link
              href={`/ai-image-generator?prompt=${encodeURIComponent(prompt || '')}`}
              className="text-primary/90 hover:text-primary text-sm line-clamp-4 break-words underline-offset-2 hover:underline"
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
            className="text-primary hover:text-primary/80 flex items-center gap-2 text-sm font-medium transition-colors"
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
      className={`py-16 md:py-24 ${showcase.className} ${className}`}
    >
      <div className="container">
        <ScrollAnimation>
          <div className="mx-auto max-w-2xl text-center text-balance">
            <h2 className="text-foreground mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
              {showcase.title}
            </h2>
            <p className="text-muted-foreground mb-6 md:mb-12 lg:mb-16">
              {showcase.description}
            </p>
          </div>
        </ScrollAnimation>
        <ScrollAnimation delay={0.2}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {showcase.items?.map((item, index) => (
              <ShowcaseCard key={index} {...item} />
            ))}
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
