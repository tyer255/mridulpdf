export type PDFTag = 'Class 9' | 'Class 10' | 'ITI' | 'Diploma 1st Year' | 'Diploma 2nd Year' | 'B.Tech Notes' | 'Others';

export interface PDFDocument {
  id: string;
  name: string;
  userId: string;
  timestamp: number;
  visibility: 'private' | 'world';
  downloadUrl: string;
  thumbnailUrl?: string;
  size?: number;
  tags: PDFTag[];
  pageCount?: number;
  isOCR?: boolean;
}
