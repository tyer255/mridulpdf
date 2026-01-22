import { useNavigate } from 'react-router-dom';
import { Camera, Upload, ScanText, ArrowRight, Sparkles, Zap, FileDown } from 'lucide-react';
import Header from '@/components/Header';

const AddPDF = () => {
  const navigate = useNavigate();

  const options = [
    {
      icon: Camera,
      title: 'Capture PDF',
      description: 'Take photos with your camera and convert them into a PDF',
      path: '/capture',
    },
    {
      icon: Upload,
      title: 'Import PDF',
      description: 'Select an existing PDF from your device storage',
      path: '/import',
    },
    {
      icon: ScanText,
      title: 'Handwriting to Text',
      description: 'Convert handwriting into editable text with AI',
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
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-[hsl(224,71%,4%)] via-[hsl(224,47%,8%)] to-[hsl(224,71%,4%)] pb-24 safe-top">
      <Header />
      
      <div className="p-4 sm:p-6 app-container">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl glass-dark-strong flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-white">Create or Import</h1>
          </div>
          <p className="text-sm text-white/60">Choose how you want to add a new PDF</p>
        </div>
        
        <div className="space-y-4">
          {options.map((option, index) => (
            <div 
              key={option.path}
              className="group relative overflow-hidden cursor-pointer glass-dark hover:border-white/20 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_hsl(217,91%,60%,0.15)]"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => navigate(option.path)}
            >
              {/* Subtle glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative p-5">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl glass-dark-strong flex items-center justify-center group-hover:border-primary/30 transition-all duration-300">
                    <option.icon className="w-7 h-7 text-white/80 group-hover:text-primary transition-colors duration-300" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                        {option.title}
                      </h2>
                      {option.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-primary to-accent text-white flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          {option.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/50 line-clamp-2">
                      {option.description}
                    </p>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full glass-dark-strong flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/30 transition-all duration-300">
                    <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Tips section */}
        <div className="mt-8">
          <div className="glass-dark rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl glass-dark-strong flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-white text-sm mb-1">Pro Tip</h3>
                <p className="text-xs text-white/50">
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
