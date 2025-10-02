export interface BusinessCard {
  id?: string;
  name_th: string;
  name_en: string;
  company: string;
  title: string;
  phone_mobile: string;
  phone_office: string;
  email: string;
  website: string;
  address: string;
  category: string;
  createdAt: number;
  createdBy?: string; // Username of the user who created this card
  // New image fields
  imageUrl?: string;
  imageFileName?: string;
  originalImageData?: string; // Base64 data from camera/upload
  originalImageMimeType?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}