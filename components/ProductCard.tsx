import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../types';
import { CheckCircleIcon, RadioButtonIcon } from './icons';

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelect: () => void;
  fallbackImageUrl: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isSelected, onSelect, fallbackImageUrl }) => {
  // AI가 크롭한 이미지를 최우선으로 사용
  const getInitialImageSrc = () => {
    if (product.croppedImageBase64) {
      return `data:image/png;base64,${product.croppedImageBase64}`;
    }
    return product.imageUrl;
  };

  const [imgSrc, setImgSrc] = useState(getInitialImageSrc());
  const hasTriedFallbacks = useRef(false);

  // 상품이 업데이트될 때마다 이미지 재설정
  useEffect(() => {
    const newImageSrc = getInitialImageSrc();
    if (newImageSrc !== imgSrc) {
      setImgSrc(newImageSrc);
      hasTriedFallbacks.current = false; // 재설정 시 오류 시도 플래그도 리셋
    }
  }, [product.croppedImageBase64, product.imageUrl]);

  const handleError = () => {
    if (!hasTriedFallbacks.current) {
      hasTriedFallbacks.current = true;
      // AI 크롭 이미지가 실패하면 전체 스타일링 이미지 사용
      if (product.croppedImageBase64 && imgSrc.includes('base64')) {
        setImgSrc(fallbackImageUrl);
      } else {
        // 플레이스홀더가 실패하면 AI 크롭 이미지나 전체 이미지 시도
        if (product.croppedImageBase64) {
          setImgSrc(`data:image/png;base64,${product.croppedImageBase64}`);
        } else {
          setImgSrc(fallbackImageUrl);
        }
      }
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
