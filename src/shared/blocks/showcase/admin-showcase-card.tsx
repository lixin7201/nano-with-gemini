'use client';

import moment from 'moment';
import { Edit, Pin, PinOff, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/shared/components/ui/card';
import { Showcase } from '@/shared/models/showcase';

interface AdminShowcaseCardProps {
  showcase: Showcase;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function AdminShowcaseCard({
  showcase,
  selected,
  onSelect,
  onPin,
  onEdit,
  onDelete,
}: AdminShowcaseCardProps) {
  const t = useTranslations('admin.showcases.list.buttons');

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute left-2 top-2 z-10">
        <Checkbox checked={selected} onCheckedChange={onSelect} />
      </div>
      {showcase.isPinned && (
        <div className="absolute right-2 top-2 z-10">
          <Badge variant="secondary" className="bg-yellow-500 text-white">
            <Pin className="mr-1 h-3 w-3" /> Pinned
          </Badge>
        </div>
      )}
      <div className="aspect-square w-full overflow-hidden bg-muted">
        <img
          src={showcase.image}
          alt={showcase.title || showcase.prompt}
          className="h-full w-full object-cover transition-transform hover:scale-105"
        />
      </div>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{moment(showcase.createdAt).format('YYYY-MM-DD')}</span>
          <Badge variant="outline">{showcase.source}</Badge>
        </div>
        <h3 className="line-clamp-1 font-semibold">
          {showcase.title || 'Untitled'}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {showcase.prompt}
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 p-4 pt-0">
        <Button variant="ghost" size="icon" onClick={onPin} title={showcase.isPinned ? t('unpin') : t('pin')}>
          {showcase.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onEdit} title={t('edit')}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          title={t('delete')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
