import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { PDFTag } from '@/types/pdf';

interface SearchBarProps {
  onSearch: (query: string, selectedTags: PDFTag[]) => void;
}

const availableTags: PDFTag[] = [
  'Class 9',
  'Class 10',
  'ITI',
  'Diploma 1st Year',
  'Diploma 2nd Year',
  'B.Tech Notes',
  'Others',
];

const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<PDFTag[]>([]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onSearch(value, selectedTags);
  };

  const toggleTag = (tag: PDFTag) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    onSearch(query, newTags);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by title or user ID..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
              <Badge
                key={tag}
                variant={isSelected ? 'default' : 'secondary'}
                className="cursor-pointer hover:bg-primary/80 transition-colors text-xs"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                {isSelected && <X className="ml-1 h-3 w-3" />}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
