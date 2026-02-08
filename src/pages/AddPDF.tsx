import { useNavigate } from 'react-router-dom';
import { Camera, Upload, ScanText, ChevronRight, Sparkles, Zap, FileDown } from 'lucide-react';
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
  ];

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-[hsl(220,25%,6%)] via-[hsl(220,20%,10%)] to-[hsl(220,25%,6%)] pb-24 safe-top">
      <Header />
      
      <div className="p-4 sm:p-6 app-container">
        {/* Page Title */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-white">Create & Import</h1>
          </div>
          <p className="text-sm text-white/50">Choose how you want to add a new PDF</p>
        </div>
        
        {/* Options Cards */}
        <div className="space-y-3">
          {options.map((option, index) => (
            <div 
              key={option.path}
              className="group relative overflow-hidden cursor-pointer rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12] active:scale-[0.98]"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => navigate(option.path)}
            >
              <div className="p-4 flex items-center gap-4">
                {/* Icon Container */}
                <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.08] transition-colors">
                  <option.icon className="w-5 h-5 text-white/70 group-hover:text-white/90 transition-colors" />
                </div>
                
                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-base font-semibold text-white">
                      {option.title}
                    </h2>
                    {option.badge && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        {option.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/40 line-clamp-1">
                    {option.description}
                  </p>
                </div>
                
                {/* Arrow */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.08] transition-colors">
                  <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pro Tip Section */}
        <div className="mt-6">
          <div className="rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.06] p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white text-sm mb-1">Pro Tip</h3>
                <p className="text-xs text-white/40 leading-relaxed">
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
