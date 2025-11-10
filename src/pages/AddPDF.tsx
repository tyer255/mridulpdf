import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Camera, Upload } from 'lucide-react';

const AddPDF = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20 p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Create or Import PDF</h1>
      
      <div className="space-y-4 max-w-md mx-auto">
        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
          onClick={() => navigate('/capture')}
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Capture PDF</h2>
              <p className="text-muted-foreground text-sm">
                Take photos with your camera and convert them into a PDF
              </p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
          onClick={() => navigate('/import')}
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Import PDF</h2>
              <p className="text-muted-foreground text-sm">
                Select an existing PDF from your device storage
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AddPDF;
