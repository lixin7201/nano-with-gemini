'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Copy, Sparkles, Search, Plus, Pin, PinOff, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Badge } from '@/shared/components/ui/badge';
import { AdminAddDialog } from '@/shared/blocks/showcase/admin-add-dialog';
import { getNanoBananaShowcaseItems } from '@/shared/adapters/nano-banana-prompts';
import { Showcase as ShowcaseDB } from '@/shared/models/showcase';

// Combined item type (static + database)
type ShowcaseItem = {
  id: string;
  title?: string;
  prompt?: string;
  image: string;
  source: 'static' | 'database';
  isPinned?: boolean;
  createdAt?: Date;
};

export default function AdminShowcasesPage() {
  const t = useTranslations('admin.showcases');
  const tShowcases = useTranslations('showcases');
  const locale = useLocale();

  const [keyword, setKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [dbItems, setDbItems] = useState<ShowcaseDB[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch database items
  const fetchDbItems = async () => {
    try {
      const res = await fetch('/api/showcases?limit=1000');
      if (res.ok) {
        const data = await res.json();
        setDbItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch db items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbItems();
  }, []);

  // Get static items
  const staticItems = useMemo(() => {
    const items = getNanoBananaShowcaseItems(undefined, locale);
    return items.map((item, index) => ({
      id: `static-${index}`,
      title: item.title,
      prompt: item.prompt,
      image: item.image?.src || '',
      source: 'static' as const,
      isPinned: false,
    }));
  }, [locale]);

  // Combine and deduplicate items (database items first, then static)
  const allItems = useMemo(() => {
    // Prefer image-based dedupe to be locale-agnostic
    const dbImages = new Set(dbItems.map(item => item.image));

    // Convert db items
    const dbShowcaseItems: ShowcaseItem[] = dbItems.map(item => ({
      id: item.id,
      title: item.title || undefined,
      prompt: item.prompt,
      image: item.image,
      source: 'database' as const,
      isPinned: item.isPinned || false,
      createdAt: item.createdAt,
    }));

    // Filter static items that don't exist in db (by image URL)
    const uniqueStaticItems = staticItems.filter(item => !dbImages.has(item.image));

    // Sort: pinned first, then by date/order
    return [...dbShowcaseItems, ...uniqueStaticItems].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }, [dbItems, staticItems]);

  // Filter by keyword
  const filteredItems = useMemo(() => {
    if (!keyword.trim()) return allItems;
    const searchTerm = keyword.toLowerCase();
    return allItems.filter((item) => {
      const title = item.title?.toLowerCase() || '';
      const prompt = item.prompt?.toLowerCase() || '';
      return title.includes(searchTerm) || prompt.includes(searchTerm);
    });
  }, [allItems, keyword]);

  // Check if item is selected
  const isSelected = (id: string) => selectedIds.includes(id);

  // Toggle selection
  const toggleSelect = (id: string) => {
    if (isSelected(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Handle delete (only for database items)
  const handleDelete = async (id: string) => {
    if (id.startsWith('static-')) {
      toast.error('静态数据无法删除');
      return;
    }

    if (!confirm(t('list.confirm_delete'))) return;

    try {
      const res = await fetch(`/api/showcases/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success(t('list.delete_success'));
      fetchDbItems();
    } catch {
      toast.error('删除失败');
    }
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    const dbIds = selectedIds.filter(id => !id.startsWith('static-'));
    if (dbIds.length === 0) {
      toast.error('只能删除数据库中的数据，静态数据无法删除');
      return;
    }

    if (!confirm(t('list.confirm_delete'))) return;

    try {
      const res = await fetch('/api/showcases/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: dbIds }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(t('list.delete_success'));
      setSelectedIds([]);
      fetchDbItems();
    } catch {
      toast.error('删除失败');
    }
  };

  // Handle pin/unpin (only for database items)
  const handlePin = async (id: string, currentPinned: boolean) => {
    if (id.startsWith('static-')) {
      toast.error('静态数据无法置顶，请先通过新增功能添加到数据库');
      return;
    }

    try {
      const res = await fetch('/api/showcases/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: currentPinned ? 'unpin' : 'pin', ids: [id] }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(currentPinned ? t('list.unpinned') : t('list.pinned'));
      fetchDbItems();
    } catch {
      toast.error('操作失败');
    }
  };

  // Showcase card component
  const ShowcaseCard = ({ item }: { item: ShowcaseItem }) => {
    const [copied, setCopied] = useState(false);
    const isStatic = item.source === 'static';

    const handleCopy = () => {
      if (item.prompt) {
        navigator.clipboard.writeText(item.prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    return (
      <div className="bg-card/25 ring-foreground/[0.07] flex flex-col overflow-hidden rounded-lg border border-transparent ring-1 relative group">
        {/* Selection checkbox */}
        <div className="absolute left-2 top-2 z-10">
          <Checkbox
            checked={isSelected(item.id)}
            onCheckedChange={() => toggleSelect(item.id)}
            className="bg-background/80"
          />
        </div>

        {/* Pin badge */}
        {item.isPinned && (
          <Badge className="absolute right-2 top-2 z-10 bg-yellow-500">
            <Pin className="h-3 w-3 mr-1" /> 置顶
          </Badge>
        )}

        {/* Source badge */}
        {isStatic && (
          <Badge variant="secondary" className="absolute right-2 top-2 z-10">
            静态
          </Badge>
        )}

        {/* Image */}
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className="relative aspect-video w-full overflow-hidden">
              <img
                src={item.image}
                alt={item.title || 'Showcase'}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                loading="lazy"
              />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl overflow-hidden p-0">
            <DialogTitle className="sr-only">{item.title || 'Showcase'}</DialogTitle>
            <img src={item.image} alt={item.title || 'Showcase'} className="h-auto w-full object-contain" />
          </DialogContent>
        </Dialog>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          {item.title && <h3 className="text-base font-semibold line-clamp-1">{item.title}</h3>}
          <p className="text-muted-foreground text-sm line-clamp-2">{item.prompt}</p>

          {/* Actions */}
          <div className="flex items-center justify-between mt-auto pt-2 border-t">
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs"
              >
                <Copy className="h-3 w-3" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <Link
                href={`/ai-image-generator?prompt=${encodeURIComponent(item.prompt || '')}`}
                className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs"
              >
                <Sparkles className="h-3 w-3" />
                Generate
              </Link>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handlePin(item.id, item.isPinned || false)}
                title={item.isPinned ? t('list.buttons.unpin') : t('list.buttons.pin')}
              >
                {item.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => handleDelete(item.id)}
                title={t('list.buttons.delete')}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="py-10 md:py-14">
      <div className="container">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center text-balance mb-8">
          <h1 className="text-foreground mb-3 text-3xl font-semibold tracking-tight md:text-4xl">
            {t('list.title')}
          </h1>
          <p className="text-muted-foreground">
            管理所有案例，包括静态数据和用户分享的数据
          </p>
        </div>

        {/* Search and Actions */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={tShowcases('search.placeholder')}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('list.buttons.delete')} ({selectedIds.length})
              </Button>
            )}
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('list.buttons.add')}
            </Button>
          </div>
        </div>

        {/* Items grid */}
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">加载中...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {tShowcases('search.no_results')}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredItems.map((item) => (
              <ShowcaseCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          共 {allItems.length} 个案例（{dbItems.length} 个数据库，{staticItems.length - (allItems.length - dbItems.length - staticItems.filter(s => !dbItems.some(d => d.prompt === s.prompt)).length)} 个静态）
        </div>
      </div>

      <AdminAddDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchDbItems}
      />
    </div>
  );
}
