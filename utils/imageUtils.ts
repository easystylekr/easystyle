/**
 * Image utility functions for handling various image formats and conversions
 */

/**
 * Converts an image to a supported format (JPEG) if it's in an unsupported format like AVIF
 * @param file The original image file
 * @param quality JPEG quality (0.1 to 1.0)
 * @returns Promise that resolves to converted file or original file if already supported
 */
export const convertImageToSupportedFormat = async (
  file: File,
  quality: number = 0.9
): Promise<{ file: File; base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw image to canvas
      ctx?.drawImage(img, 0, 0);

      // Convert to JPEG blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('이미지 변환에 실패했습니다.'));
            return;
          }

          // Create new File from blob
          const convertedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now()
          });

          // Convert to base64
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({
              file: convertedFile,
              base64,
              mimeType: 'image/jpeg'
            });
          };
          reader.onerror = () => reject(new Error('Base64 변환에 실패했습니다.'));
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('이미지 로드에 실패했습니다.'));

    // Load the image
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
  });
};

/**
 * Checks if the image format is supported by Gemini AI
 * @param mimeType The MIME type to check
 * @returns boolean indicating if the format is supported
 */
export const isSupportedImageFormat = (mimeType: string): boolean => {
  const supportedFormats = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  return supportedFormats.includes(mimeType.toLowerCase());
};

/**
 * Processes an image file to ensure it's in a supported format
 * @param file The image file to process
 * @returns Promise with processed image data
 */
export const processImageFile = async (file: File): Promise<{ base64: string; mimeType: string; size: number }> => {
  try {
    let processedData;

    if (isSupportedImageFormat(file.type)) {
      // File is already in supported format, just convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다.'));
        reader.readAsDataURL(file);
      });

      processedData = {
        base64,
        mimeType: file.type,
        size: file.size
      };
    } else {
      // Convert unsupported format to JPEG
      console.log(`Converting ${file.type} to JPEG...`);
      const converted = await convertImageToSupportedFormat(file);

      processedData = {
        base64: converted.base64,
        mimeType: converted.mimeType,
        size: converted.file.size
      };
    }

    console.log(`Processed image: ${processedData.mimeType}, size: ${Math.round(processedData.size / 1024)}KB`);
    return processedData;

  } catch (error) {
    console.error('이미지 처리 중 오류:', error);
    throw new Error('이미지 처리에 실패했습니다. 다른 이미지를 시도해주세요.');
  }
};