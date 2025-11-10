export interface PDFDocument {
  id: string;
  name: string;
  userId: string;
  timestamp: number;
  visibility: 'private' | 'public';
  downloadUrl: string;
  size?: number;
}
