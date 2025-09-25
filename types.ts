
// Fix: Moved AppScreen enum here to resolve circular dependency and export it correctly.
export enum AppScreen {
  Home = 'home',
  Styling = 'styling',
  Result = 'result',
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