import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Camera, Upload, ScanText, ArrowRight, Sparkles } from 'lucide-react';
import Header from '@/components/Header';

const AddPDF = () => {
  const navigate = useNavigate();

  const options = [
    {
      icon: Camera,
      title: 'Capture PDF',
      description: 'Take photos with your camera and convert them into a PDF',
      path: '/capture',
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-500/10 to-blue-600/10',
    },
    {
      icon: Upload,
      title: 'Import PDF',
      description: 'Select an existing PDF from your device storage',
      path: '/import',
      gradient: 'from-violet-500 to-purple-600',
      bgGradient: 'from-violet-500/10 to-purple-600/10',
    },
    {
      icon: ScanText,
      title: 'Handwriting to Text',
      description: 'Convert handwriting into editable text with AI',
      path: '/ocr',
      gradient: 'from-emerald-500 to-teal-600',
      bgGradient: 'from-emerald-500/10 to-teal-600/10',
      badge: 'AI',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Create or Import</h1>
          <p className="text-sm text-muted-foreground">Choose how you want to add a new PDF</p>
        </div>
        
        <div className="space-y-4 max-w-md mx-auto">
          {options.map((option, index) => (
            <Card 
              key={option.path}
              className="group relative overflow-hidden cursor-pointer hover-lift border-border/50 hover:border-primary/30 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => navigate(option.path)}
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${option.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <div className="relative p-5">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${option.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300`}>
                    <option.icon className="w-7 h-7 text-white" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                        {option.title}
                      </h2>
                      {option.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          {option.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {option.description}
                    </p>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* Tips section */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-4 border border-primary/10">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground text-sm mb-1">Pro Tip</h3>
                <p className="text-xs text-muted-foreground">
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
