import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Wand2, Loader2 } from 'lucide-react';
import { enhanceImage, detectBorders, cropImage, EnhancementOptions } from '@/lib/imageProcessing';
import { useToast } from '@/hooks/use-toast';

interface ImageEnhancerProps {
  image: string;
  onEnhanced: (enhancedImage: string) => void;
}

const ImageEnhancer = ({ image, onEnhanced }: ImageEnhancerProps) => {
  const [options, setOptions] = useState<EnhancementOptions>({
    whiteBackground: true,
    removeShadows: true,
    boostClarity: true,
  });
  const [autoDetectBorders, setAutoDetectBorders] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleEnhance = async () => {
    setProcessing(true);
    try {
      let processedImage = image;

      // Auto-detect and crop borders
      if (autoDetectBorders) {
        const { detectedCorners, canvas } = await detectBorders(image);
        processedImage = cropImage(canvas, detectedCorners);
      }

      // Apply enhancements
      const enhanced = await enhanceImage(processedImage, options);
      onEnhanced(enhanced);

      toast({
        title: "Image enhanced!",
        description: "Document quality improved successfully",
      });
    } catch (error) {
      console.error('Enhancement error:', error);
      toast({
        title: "Enhancement failed",
        description: "Could not process image. Using original.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="p-4 space-y-4 bg-muted/50">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Enhance Document</h3>
        <Wand2 className="h-5 w-5 text-primary" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="white-bg" className="flex-1 cursor-pointer">
            White Background
          </Label>
          <Switch
            id="white-bg"
            checked={options.whiteBackground}
            onCheckedChange={(checked) =>
              setOptions({ ...options, whiteBackground: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="shadows" className="flex-1 cursor-pointer">
            Remove Shadows
          </Label>
          <Switch
            id="shadows"
            checked={options.removeShadows}
            onCheckedChange={(checked) =>
              setOptions({ ...options, removeShadows: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="clarity" className="flex-1 cursor-pointer">
            Boost Clarity
          </Label>
          <Switch
            id="clarity"
            checked={options.boostClarity}
            onCheckedChange={(checked) =>
              setOptions({ ...options, boostClarity: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="borders" className="flex-1 cursor-pointer">
            Auto-Detect Borders
          </Label>
          <Switch
            id="borders"
            checked={autoDetectBorders}
            onCheckedChange={setAutoDetectBorders}
          />
        </div>
      </div>

      <Button
        onClick={handleEnhance}
        className="w-full"
        disabled={processing}
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Apply Enhancement
          </>
        )}
      </Button>
    </Card>
  );
};

export default ImageEnhancer;
