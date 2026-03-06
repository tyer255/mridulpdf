import { useNavigate } from 'react-router-dom';
import { Camera, Upload, ScanText, ChevronRight, Sparkles, Zap, FileDown, FileText } from 'lucide-react';
import Header from '@/components/Header';

const AddPDF = () => {
  const navigate = useNavigate();

  const options = [
    {
      icon: Camera,
      title: 'Capture PDF',
      description: 'Take photos with your camera and convert...',
      path: '/capture',
    },
    {
      icon: Upload,
      title: 'Import PDF',
      description: 'Select an existing PDF from your device...',
      path: '/import',
    },
    {
      icon: ScanText,
      title: 'Convert Handwriting',
      description: 'Convert handwriting to editable text with...',
      path: '/ocr',
      badge: 'AI',
    },
    {
      icon: FileDown,
      title: 'Compress PDF',
      description: 'Reduce PDF file size without losing quality',
      path: '/compress',
      badge: 'NEW',
    },
    {
      icon: FileText,
      title: 'Text to PDF',
      description: 'Type or paste text and convert it into a PDF',
      path: '/text-to-pdf',
      badge: 'NEW',
    },
  ];

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background pb-24 safe-top">
      <Header />
      
      <div className="p-4 sm:p-6 app-container">
        {/* Page Title */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Create & Import</h1>
          </div>
          <p className="text-sm text-muted-foreground">Choose how you want to add a new PDF</p>
        </div>
        
        {/* Options Cards */}
        <div className="space-y-3">
          {options.map((option, index) => (
            <div 
              key={option.path}
              className="group relative overflow-hidden cursor-pointer rounded-2xl bg-card/60 border border-border/50 backdrop-blur-sm transition-all duration-300 hover:bg-card hover:border-border active:scale-[0.98]"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => navigate(option.path)}
            >
              <div className="p-4 flex items-center gap-4">
                {/* Icon Container */}
                <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center flex-shrink-0 group-hover:bg-muted transition-colors">
                  <option.icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                
                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-base font-semibold text-foreground">
                      {option.title}
                    </h2>
                    {option.badge && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        {option.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {option.description}
                  </p>
                </div>
                
                {/* Arrow */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted/30 border border-border/50 flex items-center justify-center group-hover:bg-muted transition-colors">
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pro Tip Section */}
        <div className="mt-6">
          <div className="rounded-2xl bg-card/40 border border-border/50 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-sm mb-1">Pro Tip</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use "Capture PDF" for scanning documents with your camera. The photos will be automatically enhanced and converted to PDF.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPDF;
