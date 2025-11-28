'use client';

import { Link } from '@/core/i18n/navigation';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { Image as ImageType } from '@/shared/types/blocks/common';
import { Showcase as ShowcaseType } from '@/shared/types/blocks/landing';
import { Copy, Sparkles } from 'lucide-react';
import { useState } from 'react';

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

    return (
      <div className="bg-card/25 ring-foreground/[0.07] flex flex-col overflow-hidden rounded-(--radius) border border-transparent ring-1">
        <div className="relative aspect-video w-full overflow-hidden">
          <img
            src={image?.src ?? ''}
            alt={image?.alt ?? ''}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className="flex flex-1 flex-col gap-4 p-6">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          <div className="relative flex-1">
            <p className="text-muted-foreground text-sm line-clamp-4">
              {prompt}
            </p>
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
