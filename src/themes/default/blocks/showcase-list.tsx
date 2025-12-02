'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Copy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/shared/components/ui/dialog';
import { SearchForm } from '@/shared/blocks/showcase/search-form';
import { ShareDialog } from '@/shared/blocks/showcase/share-dialog';
import { Showcase } from '@/shared/models/showcase';
import { useAppContext } from '@/shared/contexts/app';

interface ShowcaseListProps {
  initialItems: Showcase[];
}

export function ShowcaseList({ initialItems }: ShowcaseListProps) {
  const t = useTranslations('showcases');
  const { user, setIsShowSignModal } = useAppContext();
  const [items, setItems] = useState<Showcase[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const fetchShowcases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (keyword) params.append('keyword', keyword);
      
      const res = await fetch(`/api/showcases?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data.items);
    } catch (error) {
      toast.error('Failed to load showcases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (keyword) {
      fetchShowcases();
    } else {
      // If keyword is empty, we might want to reset to initialItems or fetch fresh
      // For now, let's fetch fresh to ensure consistency
      fetchShowcases();
    }
  }, [keyword]);

  const handleAddClick = () => {
    if (!user) {
      setIsShowSignModal(true);
    } else {
      setIsShareDialogOpen(true);
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchForm onSearch={setKeyword} />
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          {t('share.button')}
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center">Loading...</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {t('search.no_results')}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {items.map((item) => (
            <ShowcaseCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        onSuccess={fetchShowcases}
      />
    </div>
  );
}

function ShowcaseCard({ item }: { item: Showcase }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (item.prompt) {
      navigator.clipboard.writeText(item.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-card/25 ring-foreground/[0.07] flex flex-col overflow-hidden rounded-lg border border-transparent ring-1">
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="relative aspect-video w-full overflow-hidden"
          >
            <img
              src={item.image}
              alt={item.title || item.prompt}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              loading="lazy"
            />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl overflow-hidden p-0">
          <DialogTitle className="sr-only">
            {item.title || 'Showcase image'}
          </DialogTitle>
          <img
            src={item.image}
            alt={item.title || item.prompt}
            className="h-auto w-full object-contain"
          />
        </DialogContent>
      </Dialog>
      <div className="flex flex-1 flex-col gap-4 p-4">
        {item.title && <h3 className="text-lg font-semibold">{item.title}</h3>}
        <div className="relative flex-1">
          <p className="text-muted-foreground text-sm line-clamp-2 break-words">
            {item.prompt}
          </p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={handleCopy}
            className="text-primary hover:text-primary/80 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Copy className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <Link
            href={`/ai-image-generator?prompt=${encodeURIComponent(item.prompt)}`}
            className="text-primary hover:text-primary/80 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Generate
          </Link>
        </div>
      </div>
    </div>
  );
}
