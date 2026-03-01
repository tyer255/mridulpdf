import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Send, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfName: string;
}

const FeedbackDialog = ({ open, onOpenChange, pdfName }: FeedbackDialogProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    // Store feedback locally
    const existingFeedback = JSON.parse(localStorage.getItem('user_feedback') || '[]');
    existingFeedback.push({
      pdfName,
      rating,
      feedback: feedback.trim(),
      timestamp: Date.now(),
    });
    localStorage.setItem('user_feedback', JSON.stringify(existingFeedback));

    setSubmitted(true);
    setTimeout(() => {
      onOpenChange(false);
      setSubmitted(false);
      setRating(0);
      setFeedback('');
      toast({ title: "🙏 Thank you!", description: "Your feedback helps us improve" });
    }, 1500);
  };

  const handleSkip = () => {
    onOpenChange(false);
    setRating(0);
    setFeedback('');
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-2xl max-w-sm text-center">
          <div className="py-8 space-y-3">
            <div className="text-5xl">🎉</div>
            <h3 className="text-xl font-bold text-foreground">Thank You!</h3>
            <p className="text-sm text-muted-foreground">Your feedback is valuable to us</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-5 h-5 text-primary" />
            <DialogTitle className="text-lg">How was your experience?</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            "{pdfName}" created successfully! Rate your experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Star Rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Feedback Text */}
          <Textarea
            placeholder="Tell us what you liked or what we can improve..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="min-h-[80px] resize-none rounded-xl"
            maxLength={500}
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="flex-1 rounded-xl"
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0}
              className="flex-1 rounded-xl"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
