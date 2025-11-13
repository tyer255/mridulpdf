import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Wand2, Check, X } from 'lucide-react';
import { applyFilters, enhanceImage, EnhancementOptions } from '@/lib/imageProcessing';

interface ImageFilterModalProps {
  image: string | null;
  isOpen: boolean;
  onApply: (filteredImage: string) => void;
  onSkip: () => void;
}

const ImageFilterModal = ({ image, isOpen, onApply, onSkip }: ImageFilterModalProps) => {
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [blackAndWhite, setBlackAndWhite] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (image) {
      updatePreview();
    }
  }, [image, brightness, contrast, blackAndWhite]);

  const updatePreview = async () => {
    if (!image) return;
    
    try {
      const filtered = await applyFilters(image, {
        brightness,
        contrast,
        blackAndWhite,
      });
      setPreviewImage(filtered);
    } catch (error) {
      console.error('Error applying filters:', error);
      setPreviewImage(image);
    }
  };

  const handleAutoEnhance = async () => {
    if (!image) return;
    
    setProcessing(true);
    try {
      const enhanceOptions: EnhancementOptions = {
        whiteBackground: true,
        removeShadows: true,
        boostClarity: true,
      };
      const enhanced = await enhanceImage(image, enhanceOptions);
      setPreviewImage(enhanced);
      // Reset manual adjustments when auto-enhance is applied
      setBrightness(0);
      setContrast(0);
      setBlackAndWhite(false);
    } catch (error) {
      console.error('Error auto-enhancing:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleApply = () => {
    onApply(previewImage || image || '');
    resetFilters();
  };

  const handleSkip = () => {
    onSkip();
    resetFilters();
  };

  const resetFilters = () => {
    setBrightness(0);
    setContrast(0);
    setBlackAndWhite(false);
    setPreviewImage('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => handleSkip()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply Filters</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative w-full aspect-[3/4] bg-muted rounded-lg overflow-hidden">
            {(previewImage || image) && (
              <img
                src={previewImage || image || ''}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Filter Controls */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Brightness</Label>
              <Slider
                value={[brightness]}
                onValueChange={(values) => setBrightness(values[0])}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground text-right">{brightness}</div>
            </div>

            <div className="space-y-2">
              <Label>Contrast</Label>
              <Slider
                value={[contrast]}
                onValueChange={(values) => setContrast(values[0])}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground text-right">{contrast}</div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="bw" className="cursor-pointer">
                Black & White
              </Label>
              <Switch
                id="bw"
                checked={blackAndWhite}
                onCheckedChange={setBlackAndWhite}
              />
            </div>

            <Button
              onClick={handleAutoEnhance}
              variant="outline"
              className="w-full"
              disabled={processing}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Auto-Enhance
            </Button>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button onClick={handleSkip} variant="outline" className="flex-1">
            <X className="mr-2 h-4 w-4" />
            Skip Filter
          </Button>
          <Button onClick={handleApply} className="flex-1">
            <Check className="mr-2 h-4 w-4" />
            Apply Filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageFilterModal;
