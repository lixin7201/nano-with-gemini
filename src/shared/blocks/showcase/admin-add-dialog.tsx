'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { ImageUploader } from '@/shared/blocks/common';

interface AdminAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AdminAddDialog({
  open,
  onOpenChange,
  onSuccess,
}: AdminAddDialogProps) {
  const t = useTranslations('admin.showcases.add');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    prompt: '',
    image: '',
    tags: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image) {
      toast.error('Image is required');
      return;
    }
    
    setLoading(true);

    try {
      const res = await fetch('/api/showcases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source: 'admin' }),
      });

      if (!res.ok) throw new Error('Failed to add');

      toast.success('Showcase added successfully');
      onOpenChange(false);
      setFormData({ title: '', prompt: '', image: '', tags: '' });
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to add showcase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="w-full">
              <Label className="mb-2 block">{t('fields.image')}</Label>
              <ImageUploader
                maxImages={1}
                onChange={(items) => {
                  const url = items[0]?.url || '';
                  setFormData({ ...formData, image: url });
                }}
                className="aspect-video w-full max-h-48"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">{t('fields.title')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder={t('fields.title')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="prompt">{t('fields.prompt')}</Label>
              <Textarea
                id="prompt"
                required
                value={formData.prompt}
                onChange={(e) =>
                  setFormData({ ...formData, prompt: e.target.value })
                }
                placeholder={t('fields.prompt')}
                className="min-h-[80px]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tags">{t('fields.tags')}</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder={t('fields.tags')}
              />
            </div>
          </div>

          <div className="flex-shrink-0 pt-4 border-t mt-4">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Adding...' : t('buttons.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
