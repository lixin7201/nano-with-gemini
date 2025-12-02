'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { ImageUploader } from '@/shared/blocks/common';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: {
    title?: string;
    prompt?: string;
    image?: string;
    tags?: string;
  };
  onSuccess?: () => void;
}

export function ShareDialog({
  open,
  onOpenChange,
  defaultValues,
  onSuccess,
}: ShareDialogProps) {
  const t = useTranslations('showcases.share');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: defaultValues?.title || '',
    prompt: defaultValues?.prompt || '',
    image: defaultValues?.image || '',
    tags: defaultValues?.tags || '',
  });

  // Reset form when dialog opens with new default values
  useEffect(() => {
    if (open) {
      setFormData({
        title: defaultValues?.title || '',
        prompt: defaultValues?.prompt || '',
        image: defaultValues?.image || '',
        tags: defaultValues?.tags || '',
      });
    }
  }, [open, defaultValues]);

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
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to share');

      toast.success(t('success'));
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to share showcase');
    } finally {
      setLoading(false);
    }
  };

  // Determine if we should show the uploader or just the preview
  const hasDefaultImage = !!defaultValues?.image;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            Share your creation with the community.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {hasDefaultImage ? (
              // Show preview for images from generation - smaller height
              <div className="relative w-full max-h-48 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                <img
                  src={formData.image}
                  alt="Preview"
                  className="max-h-48 w-auto object-contain"
                />
              </div>
            ) : (
              // Show uploader for manual sharing
              <div className="w-full">
                <Label className="mb-2 block">{t('fields.title')}</Label>
                <ImageUploader
                  maxImages={1}
                  onChange={(items) => {
                    const url = items[0]?.url || '';
                    setFormData({ ...formData, image: url });
                  }}
                  className="aspect-video w-full"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="title">{t('fields.title')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
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
                className="min-h-[80px] resize-none"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">{t('fields.tags')}</Label>
              <Input
                id="tags"
                placeholder="comma, separated, tags"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Sharing...' : t('button')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
