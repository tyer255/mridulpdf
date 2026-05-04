import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sparkles } from 'lucide-react';

interface WatermarkToggleProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
}

const WatermarkToggle = ({ enabled, onChange }: WatermarkToggleProps) => (
  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <Label htmlFor="watermarkToggle" className="text-sm font-semibold text-foreground cursor-pointer block">
          Mridul PDF Watermark
        </Label>
        <p className="text-xs text-muted-foreground truncate">
          Small logo + text in the corner
        </p>
      </div>
    </div>
    <Switch id="watermarkToggle" checked={enabled} onCheckedChange={onChange} />
  </div>
);

export default WatermarkToggle;