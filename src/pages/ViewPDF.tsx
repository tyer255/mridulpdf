import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PDFViewer from '@/components/PDFViewer';

const ViewPDF: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const fileUrl = searchParams.get('url');
  const fileName = searchParams.get('name') || 'Document.pdf';

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No PDF URL provided</p>
          <button 
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <PDFViewer 
      fileUrl={decodeURIComponent(fileUrl)} 
      fileName={decodeURIComponent(fileName)}
      onClose={() => navigate(-1)}
    />
  );
};

export default ViewPDF;
