import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Product, ProductCategory } from '../types';
import { searchNaverShopping } from './naverService';

/**
 * Determines appropriate background context based on style prompt and description
 */
const getBackgroundContext = (prompt: string, description: string): { description: string; setting: string; lighting: string } => {
    const combinedText = `${prompt} ${description}`.toLowerCase();

    // Business/Formal contexts
    if (combinedText.includes('비즈니스') || combinedText.includes('정장') || combinedText.includes('회사') ||
        combinedText.includes('미팅') || combinedText.includes('오피스') || combinedText.includes('formal') ||
        combinedText.includes('business')) {
        return {
            description: "Modern office environment with clean glass windows and city view",
            setting: "Professional office space with minimalist interior design",
            lighting: "Natural daylight from large windows with soft indoor lighting"
        };
    }

    // Casual/Dating contexts
    if (combinedText.includes('데이트') || combinedText.includes('카페') || combinedText.includes('브런치') ||
        combinedText.includes('casual') || combinedText.includes('date') || combinedText.includes('coffee')) {
        return {
            description: "Cozy urban cafe setting with warm wooden interior and plants",
            setting: "Trendy cafe with exposed brick walls and natural materials",
            lighting: "Warm ambient lighting with natural window light"
        };
    }

    // Party/Night out contexts
    if (combinedText.includes('파티') || combinedText.includes('클럽') || combinedText.includes('밤') ||
        combinedText.includes('party') || combinedText.includes('night') || combinedText.includes('evening')) {
        return {
            description: "Sophisticated urban nightlife setting with city lights",
            setting: "Upscale rooftop lounge or modern bar with city skyline",
            lighting: "Moody evening lighting with warm accent lights and city glow"
        };
    }

    // Outdoor/Active contexts
    if (combinedText.includes('야외') || combinedText.includes('공원') || combinedText.includes('걷기') ||
        combinedText.includes('outdoor') || combinedText.includes('park') || combinedText.includes('활동')) {
        return {
            description: "Beautiful urban park setting with trees and modern architecture",
            setting: "Contemporary city park with walking paths and green spaces",
            lighting: "Natural daylight with soft shadows from trees"
        };
    }

    // Shopping/Street contexts
    if (combinedText.includes('쇼핑') || combinedText.includes('거리') || combinedText.includes('스트리트') ||
        combinedText.includes('shopping') || combinedText.includes('street') || combinedText.includes('urban')) {
        return {
            description: "Vibrant city street with modern storefronts and urban atmosphere",
            setting: "Stylish shopping district with contemporary architecture",
            lighting: "Bright daylight with urban ambiance"
        };
    }

    // Travel/Vacation contexts
    if (combinedText.includes('여행') || combinedText.includes('휴가') || combinedText.includes('바다') ||
        combinedText.includes('travel') || combinedText.includes('vacation') || combinedText.includes('beach')) {
        return {
            description: "Scenic travel destination with beautiful natural backdrop",
            setting: "Picturesque location with natural beauty and architectural elements",
            lighting: "Golden hour lighting with natural warm tones"
        };
    }

    // Default: Clean, versatile background
    return {
        description: "Clean, modern studio setting with subtle architectural elements",
        setting: "Minimalist contemporary space with neutral tones and geometric elements",
        lighting: "Professional studio lighting with soft, even illumination"
    };
};

// Fix: Initialize the Gemini API client. This is required for all API calls.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a follow-up question to clarify the user's styling request.
 * This helps in gathering more specific details before generating a style.
 * @param prompt The user's initial styling request.
 * @returns A promise that resolves to an object with a question and example answers.
 */
export const generateFollowUpQuestion = async (prompt: string): Promise<{ question: string; examples: string[] }> => {
    // Fix: Use gemini-2.5-flash for general text tasks.
    const model = 'gemini-2.5-flash';
    const contents = `사용자의 스타일링 요청에 대해 더 구체적인 정보를 얻기 위한 질문을 하나 생성해줘. 사용자의 요청: "${prompt}". 
    질문은 사용자가 자신의 취향을 더 잘 표현할 수 있도록 도와야 해.
    예시 답변도 3개 제공해줘.
    결과는 반드시 아래 JSON 형식과 일치해야 해.
    {
      "question": "string",
      "examples": ["string", "string", "string"]
    }`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents,
            config: {
                // Fix: Configure the model to return a JSON response.
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        examples: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['question', 'examples'],
                }
            }
        });
        
        // Fix: Use response.text to get the generated content as a string.
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error generating follow-up question:", error);
        throw new Error("AI가 질문을 생성하는 데 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
};

/**
 * Generates a new style, including a styled image, description, and a list of real products.
 * This is a multi-step process:
 * 1. Generate a style plan and product search keywords from the user's image and prompt.
 * 2. Use a mock shopping search to find real products based on the keywords.
 * 3. Generate a new, styled image of the user wearing the found products.
 * @param base64Image The user's original image as a base64 string.
 * @param mimeType The MIME type of the user's image.
 * @param prompt The user's styling request.
 * @returns A promise that resolves to the complete styling result.
 */
export const generateStyleWithRealProducts = async (
    base64Image: string,
    mimeType: string,
    prompt: string
): Promise<{ imageBase64: string; description: string; products: Product[] }> => {
    const model = 'gemini-2.5-flash';

    const systemInstruction = `You are an expert fashion stylist. Your goal is to analyze a user's photo and their request, then create a new, improved style for them. You must suggest specific, real-world clothing items.

    Your tasks are:
    1.  **Analyze**: Look at the user's photo and understand their request.
    2.  **Describe the new style**: Write a short, appealing description of the new style you are proposing in Korean.
    3.  **List items**: Identify the key clothing items for this new style (e.g., top, bottom, shoes, accessory). For each item, provide a detailed search keyword that can be used to find a real product on a Korean online shopping mall like Musinsa. The keyword should be in Korean and very specific (e.g., '남자 오버핏 옥스포드 셔츠 화이트', '여성 와이드핏 슬랙스 블랙'). The category must be one of '상의', '하의', '신발', '악세서리'.`;
    
    try {
        // Step 1: Get style recommendation and product search keywords.
        const initialResponse = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Image } },
                    { text: `이 사진의 사람을 위해 "${prompt}" 요청에 맞춰 새로운 스타일을 제안해줘.` }
                ]
            },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: {
                            type: Type.STRING,
                            description: "The new style description in Korean."
                        },
                        items: {
                            type: Type.ARRAY,
                            description: "List of items for the new style.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    category: {
                                        type: Type.STRING,
                                        description: "Category of the item. Must be one of '상의', '하의', '신발', '악세서리'."
                                    },
                                    searchKeyword: {
                                        type: Type.STRING,
                                        description: "A specific search keyword in Korean for an online shop."
                                    }
                                },
                                required: ['category', 'searchKeyword']
                            }
                        }
                    },
                    required: ['description', 'items']
                }
            }
        });

        const stylePlan = JSON.parse(initialResponse.text);
        const description: string = stylePlan.description;
        const itemsToSearch: { category: string; searchKeyword: string }[] = stylePlan.items;

        // Step 2: Search for real products using the keywords.
        const foundProducts: Product[] = (
            await Promise.all(
                itemsToSearch.map(async (item) => {
                    const product = await searchNaverShopping(item.searchKeyword);
                    if (product) {
                        return { ...product, category: item.category as ProductCategory };
                    }
                    return null;
                })
            )
        ).filter((p): p is Product => p !== null);

        if (foundProducts.length === 0) {
            throw new Error("추천할만한 상품을 찾지 못했습니다. 다른 스타일로 시도해보세요.");
        }

        // Step 3: Generate the final styled image using the found products with contextual background.
        const productInfoForImageGen = foundProducts.map(p => `- ${p.category}: ${p.brand} ${p.name}`).join('\n');

        // Determine appropriate background based on style context
        const backgroundContext = getBackgroundContext(prompt, description);

        const imageGenPrompt = `
        Original photo of the person is provided.
        New style description: "${description}"
        Real products to use for the new style:
        ${productInfoForImageGen}

        Generate a new, photorealistic image of the person from the original photo. They should be wearing the new style composed of the exact products listed. The person's face and body should be preserved.

        Background: ${backgroundContext.description}
        Setting: ${backgroundContext.setting}
        Lighting: ${backgroundContext.lighting}

        Make sure the background complements the style and creates an appropriate atmosphere for the outfit. The image should look natural and professionally styled.
        `;
        
        // Fix: Use the correct image editing model 'gemini-2.5-flash-image-preview'.
        const imageEditModel = 'gemini-2.5-flash-image-preview';
        
        const imageGenResponse = await ai.models.generateContent({
            model: imageEditModel,
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Image } },
                    { text: imageGenPrompt }
                ]
            },
            config: {
                // Fix: Must include both IMAGE and TEXT modalities for this model.
                responseModalities: [Modality.IMAGE, Modality.TEXT]
            }
        });

        let newImageBase64: string | undefined;
        // Fix: Correctly parse the response to find the generated image data.
        for (const part of imageGenResponse.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                newImageBase64 = part.inlineData.data;
                break;
            }
        }

        if (!newImageBase64) {
            throw new Error("AI가 새로운 스타일 이미지를 생성하는 데 실패했습니다.");
        }

        return {
            imageBase64: newImageBase64,
            description: description,
            products: foundProducts
        };

    } catch (error) {
        console.error("Error generating style with real products:", error);
        if (error instanceof Error) {
            throw new Error(`스타일 생성 중 오류가 발생했습니다: ${error.message}`);
        }
        throw new Error("알 수 없는 오류로 스타일 생성에 실패했습니다.");
    }
};

/**
 * Crops a specific product from a larger styled image to create a thumbnail with category-specific instructions.
 * @param styledImageBase64 The base64 string of the main styled image.
 * @param productCategory The category of the product to crop.
 * @param productName The name of the product to crop.
 * @returns A promise that resolves to the base64 string of the cropped image, or null on failure.
 */
export const cropImageForProduct = async (
    styledImageBase64: string,
    productCategory: ProductCategory,
    productName: string
): Promise<string | null> => {
    // Fix: Use the correct image editing model 'gemini-2.5-flash-image-preview'.
    const model = 'gemini-2.5-flash-image-preview';

    // Get category-specific cropping instructions
    const cropInstruction = getCropInstructionByCategory(productCategory, productName);

    const prompt = `
    이 전체 스타일링 이미지에서 "${productName}" (${productCategory})을 정확히 찾아서 상품 이미지로 크롭해줘.

    작업 단계:
    1. 이미지에서 해당 ${productCategory} 제품을 정확히 식별
    2. 제품이 잘 보이는 각도와 범위로 크롭
    3. 제품의 형태와 디테일이 명확히 드러나도록 프레임 조정

    ${cropInstruction}

    중요 사항:
    - 착용된 상태 그대로 자연스럽게 크롭 (제품만 분리하지 말고)
    - 제품의 핏과 스타일링 효과가 잘 보이도록
    - 배경은 자연스럽게 포함하되 제품에 집중
    - 상품 쇼핑몰에서 볼 수 있는 품질의 이미지로 생성
    - 제품이 불분명하거나 찾을 수 없다면 전체 스타일링의 해당 부분을 포함하여 크롭

    결과: 전문적인 상품 이미지 (착용 상태)
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    // Provide the styled image to be cropped
                    { inlineData: { mimeType: 'image/png', data: styledImageBase64 } },
                    { text: prompt }
                ]
            },
            config: {
                 // Fix: Must include both IMAGE and TEXT modalities for this model.
                responseModalities: [Modality.IMAGE, Modality.TEXT]
            }
        });

        // Add a defensive check to ensure candidates exist before processing.
        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                    return part.inlineData.data;
                }
            }
        }

        console.warn(`Could not crop image for product: ${productName}`);
        return null;

    } catch (error) {
        console.error(`Error cropping image for ${productName}:`, error);
        // Don't throw, as this is a non-critical enhancement. Return null instead.
        return null;
    }
};

/**
 * Gets category-specific cropping instructions
 */
const getCropInstructionByCategory = (category: ProductCategory, productName: string): string => {
    switch (category) {
        case '상의':
            return `
            상의 (${productName})에 집중해서:
            - 셔츠/블라우스/니트 등의 전체 형태가 보이도록
            - 어깨부터 허리 또는 엉덩이까지 포함
            - 소매와 칼라 디테일이 명확히 보이도록
            - 옷의 핏과 실루엣이 잘 드러나도록
            `;

        case '하의':
            return `
            하의 (${productName})에 집중해서:
            - 바지/스커트/반바지의 전체 길이가 보이도록
            - 허리부터 발목 또는 무릎까지 포함
            - 핏과 실루엣이 명확히 드러나도록
            - 주름이나 라인이 자연스럽게 보이도록
            `;

        case '신발':
            return `
            신발 (${productName})에 집중해서:
            - 신발 전체가 명확히 보이도록
            - 발과 발목 부분도 약간 포함
            - 신발의 형태와 스타일이 잘 드러나도록
            - 측면 또는 전면에서 가장 매력적인 각도로
            `;

        case '악세서리':
            return `
            악세서리 (${productName})에 집중해서:
            - 가방/모자/목걸이/귀걸이 등을 클로즈업
            - 악세서리가 착용된 상태로 자연스럽게
            - 디테일과 질감이 명확히 보이도록
            - 주변 컨텍스트도 약간 포함하여 사용감 표현
            `;

        default:
            return `
            해당 제품을 중심으로:
            - 제품의 전체적인 모습이 보이도록
            - 착용된 상태에서 자연스럽게
            - 제품의 특징이 잘 드러나도록
            `;
    }
};