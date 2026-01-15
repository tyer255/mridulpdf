import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { PDFTag } from '@/types/pdf';
import { cn } from '@/lib/utils';

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
  const [isFocused, setIsFocused] = useState(false);

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
      <div className={cn(
        "relative rounded-2xl transition-all duration-300",
        isFocused && "ring-2 ring-primary/20"
      )}>
        <Search className={cn(
          "absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors duration-200",
          isFocused ? "text-primary" : "text-muted-foreground"
        )} />
        <Input
          type="text"
          placeholder="Search PDFs by title or user..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="pl-11 pr-4 h-12 rounded-2xl border-border/50 bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-primary/50 transition-colors"
        />
      </div>

      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
              <Badge
                key={tag}
                variant={isSelected ? 'default' : 'outline'}
                className={cn(
                  "cursor-pointer transition-all duration-200 text-xs px-3 py-1.5 rounded-full font-medium",
                  isSelected 
                    ? 'gradient-primary text-white border-transparent shadow-md hover:shadow-lg' 
                    : 'border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5'
                )}
                onClick={() => toggleTag(tag)}
              >
                <span>{tag}</span>
                {isSelected && <X className="ml-1.5 h-3 w-3" />}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
