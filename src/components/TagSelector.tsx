import { PDFTag } from '@/types/pdf';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface TagSelectorProps {
  selectedTags: PDFTag[];
  onChange: (tags: PDFTag[]) => void;
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

const TagSelector = ({ selectedTags, onChange }: TagSelectorProps) => {
  const toggleTag = (tag: PDFTag) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div>
      <Label>Tags (Optional)</Label>
      <p className="text-sm text-muted-foreground mb-3">
        Help others discover your PDF by adding relevant tags
      </p>
      <div className="flex flex-wrap gap-2">
        {availableTags.map(tag => {
          const isSelected = selectedTags.includes(tag);
          return (
            <Badge
              key={tag}
              variant={isSelected ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-primary/80 transition-colors"
              onClick={() => toggleTag(tag)}
            >
              {tag}
              {isSelected && <X className="ml-1 h-3 w-3" />}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

export default TagSelector;
