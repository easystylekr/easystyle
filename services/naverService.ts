// Fix: Replaced placeholder content with a functional mock implementation to resolve module errors.
import { Product } from '../types';
import { generatePlaceholderImage } from '../utils/placeholderUtils';

/**
 * Generates realistic product information based on the search query
 */
const generateRealisticProduct = (query: string): { brand: string; name: string; price: number; size: string; storeName: string } => {
    const lowerQuery = query.toLowerCase();

    // Brand mapping based on product type and style
    const brandsByCategory = {
        formal: ['ZARA', '유니클로', 'H&M', 'COS', '엠포리오 아르마니', '휴고보스'],
        casual: ['BEAMS', '어반리서치', '나노유니버스', '스피크이지', '마크 곤잘레스', 'KENZO'],
        street: ['나이키', '아디다스', '뉴발란스', '컨버스', '반스', '푸마'],
        luxury: ['구찌', '프라다', '생로랑', '발렌시아가', '셀린느', 'A.P.C.'],
        korean: ['스튜디오톰보이', '젠틀몬스터', '아더에러', '앤더슨벨', '마르디 메크르디', '우영미']
    };

    // Determine category and select appropriate brand
    let selectedBrands = brandsByCategory.casual; // default
    if (lowerQuery.includes('정장') || lowerQuery.includes('셔츠') || lowerQuery.includes('블레이저')) {
        selectedBrands = brandsByCategory.formal;
    } else if (lowerQuery.includes('스니커즈') || lowerQuery.includes('운동화') || lowerQuery.includes('트레이닝')) {
        selectedBrands = brandsByCategory.street;
    } else if (lowerQuery.includes('명품') || lowerQuery.includes('럭셔리') || lowerQuery.includes('프리미엄')) {
        selectedBrands = brandsByCategory.luxury;
    } else if (lowerQuery.includes('국내') || lowerQuery.includes('한국')) {
        selectedBrands = brandsByCategory.korean;
    }

    const brand = selectedBrands[Math.floor(Math.random() * selectedBrands.length)];

    // Generate realistic price based on brand and category
    let priceRange = { min: 30000, max: 150000 }; // default
    if (brandsByCategory.luxury.includes(brand)) {
        priceRange = { min: 200000, max: 800000 };
    } else if (brandsByCategory.street.includes(brand)) {
        priceRange = { min: 80000, max: 250000 };
    } else if (brandsByCategory.formal.includes(brand)) {
        priceRange = { min: 50000, max: 300000 };
    }

    const price = Math.floor(Math.random() * (priceRange.max - priceRange.min + 1) / 1000) * 1000 + priceRange.min;

    // Generate realistic size based on product type
    let size = 'Free';
    if (lowerQuery.includes('셔츠') || lowerQuery.includes('티셔츠') || lowerQuery.includes('니트') ||
        lowerQuery.includes('블라우스') || lowerQuery.includes('가디건')) {
        const sizes = ['S', 'M', 'L', 'XL'];
        size = sizes[Math.floor(Math.random() * sizes.length)];
    } else if (lowerQuery.includes('바지') || lowerQuery.includes('팬츠') || lowerQuery.includes('진') || lowerQuery.includes('슬랙스')) {
        const sizes = ['28', '30', '32', '34', '36'];
        size = sizes[Math.floor(Math.random() * sizes.length)];
    } else if (lowerQuery.includes('신발') || lowerQuery.includes('스니커즈') || lowerQuery.includes('부츠') || lowerQuery.includes('로퍼')) {
        const sizes = ['240', '245', '250', '255', '260', '265', '270', '275', '280'];
        size = sizes[Math.floor(Math.random() * sizes.length)];
    }

    // Clean up product name
    const cleanName = query.replace(/"/g, '').replace(/남성|여성|남자|여자/g, '').trim();

    return {
        brand,
        name: cleanName,
        price,
        size,
        storeName: `${brand} 공식몰`
    };
};

/**
 * Mocks a search for a product on Naver Shopping.
 * In a real application, this would call a backend API to perform the search.
 * @param query The search query from the AI model.
 * @returns A promise that resolves to a mock product or null.
 */
export const searchNaverShopping = async (query: string): Promise<Omit<Product, 'category' | 'croppedImageBase64'> | null> => {
    console.log(`[Mock Naver Search] Searching for: "${query}"`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));

    if (!query || query.trim() === '') {
        return null;
    }

    // Generate a plausible mock product based on the query with more realistic details.
    const productInfo = generateRealisticProduct(query);

    // Generate local placeholder image (will be replaced by AI-cropped image)
    const placeholderImage = generatePlaceholderImage(query, 400, 500);

    return {
        brand: productInfo.brand,
        name: productInfo.name,
        price: productInfo.price,
        imageUrl: placeholderImage, // Will be replaced by AI-cropped image from styled photo
        recommendedSize: productInfo.size,
        productUrl: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`,
        storeName: productInfo.storeName,
    };
};
