

## Problem

"Ask AI" button press करने पर AI Chat modal खुलता है, लेकिन उसमें type/chat नहीं हो पा रहा। इसके दो कारण हैं:

1. **Bottom Sheet बंद नहीं होती** — AI Chat modal (z-100) के पीछे Sheet (z-50) और उसका overlay अभी भी open रहता है, जो touch/click events को interfere करता है।
2. **Sheet overlay blocks input** — Sheet का `bg-black/80` overlay `fixed inset-0` है और pointer events capture करता है, जिससे AI Chat के input field में type नहीं हो पाता।

## Solution

`PDFDetailsSheet.tsx` में `handleAskAI` function को update करना है ताकि AI Chat open करने से पहले bottom Sheet बंद हो जाए।

## Technical Changes

### File: `src/components/PDFDetailsSheet.tsx`

`handleAskAI` function में Sheet को close करने का step add करना:

```typescript
const handleAskAI = async () => {
  setLoadingContext(true);
  try {
    const storedText = localStorage.getItem(`ocr_text_${pdf.id}`);
    if (storedText) {
      setPdfContext(storedText);
    } else {
      setPdfContext('(OCR text not available for this document)');
    }
    // Close the sheet BEFORE opening AI chat
    onOpenChange(false);
    setShowAIChat(true);
  } catch (error) {
    console.error('Error loading PDF context:', error);
  } finally {
    setLoadingContext(false);
  }
};
```

यह एक single-line fix है — `onOpenChange(false)` call add करना `setShowAIChat(true)` से पहले। इससे Sheet बंद होगी, overlay हटेगा, और AI Chat modal में freely type और interact कर पाओगे।

