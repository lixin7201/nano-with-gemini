'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

interface SearchFormProps {
  onSearch: (keyword: string) => void;
  initialKeyword?: string;
}

export function SearchForm({ onSearch, initialKeyword = '' }: SearchFormProps) {
  const t = useTranslations('showcases.search');
  const [keyword, setKeyword] = useState(initialKeyword);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(keyword);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm items-center space-x-2">
      <Input
        type="text"
        placeholder={t('placeholder')}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <Button type="submit" size="icon">
        <Search className="h-4 w-4" />
        <span className="sr-only">{t('button')}</span>
      </Button>
    </form>
  );
}
