// Fix: Moved AppScreen enum here to resolve circular dependency and export it correctly.
export enum AppScreen {
  Auth = 'auth',
  Home = 'home',
  Styling = 'styling',
  Result = 'result',
  MyPage = 'mypage',
  Admin = 'admin',
}

export enum ProductCategory {
  Top = '상의',
  Bottom = '하의',
  Shoes = '신발',
  Accessory = '악세서리',
}

export interface Product {
  brand: string;
  name: string;
  price: number;
  imageUrl: string;
  recommendedSize: string;
  productUrl: string;
  storeName: string;
  category: ProductCategory;
  croppedImageBase64?: string;
}

export interface User {
  name: string;
  email: string;
  phone: string;
  password: string; // In a real app, this would be a hash.
}

export interface StyleHistoryItem {
  id: string;
  originalImage: { base64: string; mimeType: string; url: string };
  styledResult: { imageBase64: string; description: string };
  products: Product[];
  prompt: string;
  createdAt: string;
}

export enum PurchaseRequestStatus {
    Pending = 'Pending',
    Completed = 'Completed',
}

export interface PurchaseRequest {
    id: string;
    userEmail: string;
    products: Product[];
    totalPrice: number;
    status: PurchaseRequestStatus;
    createdAt: string;
}