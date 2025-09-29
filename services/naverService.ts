// Fix: Replaced placeholder content with a functional mock implementation to resolve module errors.
import { Product } from '../types';
import { generatePlaceholderImage } from '../utils/placeholderUtils';

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

    // Generate a plausible mock product based on the query.
    // This makes the demo more dynamic than a single hardcoded product.
    const price = Math.floor(Math.random() * 100) * 1000 + 30000; // 30,000 ~ 129,000
    const brands = ['BEAMS', 'Maison Kitsuné', 'A.P.C.', 'Nike', 'Adidas', 'New Balance'];
    const brand = brands[Math.floor(Math.random() * brands.length)];

    // Generate local placeholder image instead of using external service
    const placeholderImage = generatePlaceholderImage(query, 400, 500);

    return {
        brand: brand,
        name: `${query.replace(/"/g, '')}`,
        price: price,
        imageUrl: placeholderImage, // Use local placeholder instead of via.placeholder.com
        recommendedSize: 'Free',
        productUrl: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`,
        storeName: `${brand} 공식 스토어`,
    };
};
