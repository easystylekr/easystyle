import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { CheckCircleIcon, RadioButtonIcon } from './icons';

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelect: () => void;
  fallbackImageUrl: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isSelected, onSelect, fallbackImageUrl }) => {
  const [imgSrc, setImgSrc] = useState(product.imageUrl);
  const hasTriedCroppedFallback = useRef(false);

  const handleError = () => {
    // 1순위: 실제 상품 이미지 (초기값)
    // 2순위: AI가 생성한 부분 확대 이미지
    if (product.croppedImageBase64 && !hasTriedCroppedFallback.current) {
      setImgSrc(`data:image/png;base64,${product.croppedImageBase64}`);
      hasTriedCroppedFallback.current = true;
    } else {
    // 3순위: 전체 스타일링 이미지
      setImgSrc(fallbackImageUrl);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
  };

  return (
    <div
      onClick={onSelect}
      className={`bg-slate-800 rounded-lg overflow-hidden shadow-lg transition-all duration-300 cursor-pointer border-2 ${isSelected ? 'border-amber-400' : 'border-transparent'} relative flex flex-col`}
    >
      <div className="relative w-full" style={{ paddingBottom: '125%' }}>
        <img
          src={imgSrc}
          alt={product.name}
          className="absolute top-0 left-0 w-full h-full object-cover"
          onError={handleError}
        />
      </div>
      <div className="p-3 flex flex-col flex-grow">
        <p className="text-xs text-slate-400 truncate">{product.brand}</p>
        <h3 className="text-sm font-medium text-slate-100 mt-1 h-10 break-keep">{product.name}</h3>
        <div className="flex-grow"></div>
        <p className="text-base font-bold text-slate-100 mt-2">{formatPrice(product.price)}</p>
      </div>
      <div className="absolute top-2 right-2">
        {isSelected
          ? <CheckCircleIcon className="w-6 h-6 text-amber-400 bg-slate-900 rounded-full" />
          : <RadioButtonIcon className="w-6 h-6 text-slate-500" />
        }
      </div>
    </div>
  );
};

export default ProductCard;
