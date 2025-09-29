import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Product, ProductCategory } from '../types';
import { searchNaverShopping } from './naverService';

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

        // Step 3: Generate the final styled image using the found products.
        const productInfoForImageGen = foundProducts.map(p => `- ${p.category}: ${p.brand} ${p.name}`).join('\n');
        const imageGenPrompt = `
        Original photo of the person is provided.
        New style description: "${description}"
        Real products to use for the new style:
        ${productInfoForImageGen}

        Generate a new, photorealistic image of the person from the original photo. They should be wearing the new style composed of the exact products listed. The person's face and body should be preserved. The background should be a simple, neutral studio background.
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
 * Crops a specific product from a larger styled image to create a thumbnail.
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
    const prompt = `이 이미지에서 "${productName}" (${productCategory}) 제품만 클로즈업해서 잘라내줘. 배경은 제거하고 제품만 명확하게 보여줘.`;

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