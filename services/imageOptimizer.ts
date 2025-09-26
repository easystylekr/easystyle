// 고성능 이미지 최적화 서비스
export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  progressive?: boolean;
}

export interface OptimizedImageResult {
  base64: string;
  width: number;
  height: number;
  size: number;
  format: string;
  compressionRatio: number;
}

// Web Workers를 사용한 비동기 이미지 처리 (수정된 버전)
const createImageWorker = () => {
  const workerCode = `
    self.onmessage = async function(e) {
      const { imageData, options } = e.data;

      try {
        // data URL을 Blob으로 변환
        const response = await fetch(imageData);
        const blob = await response.blob();

        // createImageBitmap으로 이미지 생성 (Web Worker 호환)
        const imageBitmap = await createImageBitmap(blob);

        const { width, height } = imageBitmap;
        const maxDim = Math.max(options.maxWidth || 1600, options.maxHeight || 1600);
        const scale = Math.min(1, maxDim / Math.max(width, height));

        const newWidth = Math.max(1, Math.round(width * scale));
        const newHeight = Math.max(1, Math.round(height * scale));

        // OffscreenCanvas를 사용한 비동기 이미지 처리
        const canvas = new OffscreenCanvas(newWidth, newHeight);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          self.postMessage({
            success: false,
            error: 'Canvas context not available'
          });
          imageBitmap.close();
          return;
        }

        // 고품질 이미지 처리 옵션
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 이미지 그리기
        ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);

        // ImageBitmap 메모리 해제
        imageBitmap.close();

        // 포맷별 최적화
        const quality = options.quality || 0.85;
        const format = options.format === 'webp' ? 'image/webp' : 'image/jpeg';

        try {
          const resultBlob = await canvas.convertToBlob({ type: format, quality });

          // ArrayBuffer로 읽어서 base64 변환
          const arrayBuffer = await resultBlob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // base64 인코딩
          let binary = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64 = btoa(binary);

          self.postMessage({
            success: true,
            result: {
              base64,
              width: newWidth,
              height: newHeight,
              size: resultBlob.size,
              format: format.split('/')[1],
              compressionRatio: (resultBlob.size / (width * height * 4)) * 100
            }
          });
        } catch (blobError) {
          self.postMessage({
            success: false,
            error: 'Failed to convert to blob: ' + blobError.message
          });
        }
      } catch (error) {
        self.postMessage({
          success: false,
          error: 'Failed to process image: ' + error.message
        });
      }
    };
  `;

  return new Worker(URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' })));
};

// 메인 최적화 함수
export async function optimizeImage(
  dataUrl: string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const defaultOptions = {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.85,
    format: 'jpeg' as const,
    progressive: true
  };

  const finalOptions = { ...defaultOptions, ...options };

  // Web Worker가 지원되는 경우 사용
  if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
    return new Promise((resolve, reject) => {
      const worker = createImageWorker();

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Image processing timeout'));
      }, 10000); // 10초 타임아웃

      worker.onmessage = (e) => {
        clearTimeout(timeout);
        worker.terminate();

        if (e.data.success) {
          resolve(e.data.result);
        } else {
          reject(new Error(e.data.error));
        }
      };

      worker.onerror = () => {
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error('Worker error'));
      };

      worker.postMessage({ imageData: dataUrl, options: finalOptions });
    });
  } else {
    // Fallback: 메인 스레드에서 최적화된 처리
    return optimizeImageSync(dataUrl, finalOptions);
  }
}

// 동기식 최적화 (개선된 버전)
export function optimizeImageSync(
  dataUrl: string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const { width, height } = img;
        const maxDim = Math.max(options.maxWidth || 1600, options.maxHeight || 1600);
        const scale = Math.min(1, maxDim / Math.max(width, height));

        const newWidth = Math.max(1, Math.round(width * scale));
        const newHeight = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // 고품질 이미지 처리 설정
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 작은 청크로 나누어 처리 (메인 스레드 차단 최소화)
        const chunkSize = 100;
        let currentY = 0;

        const processChunk = () => {
          const chunkHeight = Math.min(chunkSize, newHeight - currentY);
          if (chunkHeight <= 0) {
            // 모든 청크 처리 완료
            const quality = options.quality || 0.85;
            const format = options.format === 'webp' ? 'image/webp' : 'image/jpeg';

            canvas.toBlob((blob) => {
              if (blob) {
                const reader = new FileReader();
                reader.onload = () => {
                  const base64 = (reader.result as string).split(',')[1];
                  resolve({
                    base64,
                    width: newWidth,
                    height: newHeight,
                    size: blob.size,
                    format: format.split('/')[1],
                    compressionRatio: (blob.size / (width * height * 4)) * 100
                  });
                };
                reader.readAsDataURL(blob);
              } else {
                reject(new Error('Failed to create blob'));
              }
            }, format, quality);
            return;
          }

          // 현재 청크 그리기
          const srcY = (currentY / newHeight) * height;
          const srcHeight = (chunkHeight / newHeight) * height;

          ctx.drawImage(
            img,
            0, srcY, width, srcHeight,
            0, currentY, newWidth, chunkHeight
          );

          currentY += chunkHeight;

          // 다음 청크를 비동기로 처리
          setTimeout(processChunk, 0);
        };

        processChunk();
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

// 다단계 점진적 최적화
export async function progressiveOptimization(
  dataUrl: string,
  onProgress?: (stage: string, progress: number) => void
): Promise<OptimizedImageResult> {
  const stages = [
    { name: '이미지 분석 중...', maxDim: 2048, quality: 0.9 },
    { name: '1차 최적화 중...', maxDim: 1600, quality: 0.85 },
    { name: '최종 최적화 중...', maxDim: 1200, quality: 0.8 }
  ];

  let result: OptimizedImageResult | null = null;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    onProgress?.(stage.name, (i / stages.length) * 100);

    try {
      result = await optimizeImage(dataUrl, {
        maxWidth: stage.maxDim,
        maxHeight: stage.maxDim,
        quality: stage.quality,
        format: 'jpeg'
      });

      // 적절한 크기에 도달하면 조기 종료
      if (result.size < 500 * 1024) { // 500KB 미만
        break;
      }

      dataUrl = `data:image/jpeg;base64,${result.base64}`;
    } catch (error) {
      console.warn(`Stage ${i + 1} failed:`, error);
      if (i === stages.length - 1) {
        throw error; // 마지막 단계에서 실패하면 오류 발생
      }
    }
  }

  onProgress?.('완료!', 100);
  return result!;
}

// 빠른 미리보기 생성
export async function createFastPreview(
  dataUrl: string,
  maxDim: number = 400
): Promise<string> {
  try {
    const result = await optimizeImage(dataUrl, {
      maxWidth: maxDim,
      maxHeight: maxDim,
      quality: 0.7,
      format: 'jpeg'
    });
    return `data:image/jpeg;base64,${result.base64}`;
  } catch (error) {
    console.warn('Fast preview failed:', error);
    return dataUrl; // 원본 반환
  }
}

// 이미지 포맷 지원 감지
export function getSupportedFormats(): string[] {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  const formats: string[] = ['jpeg'];

  // WebP 지원 확인
  if (canvas.toDataURL('image/webp').indexOf('image/webp') === 5) {
    formats.push('webp');
  }

  // AVIF 지원 확인 (최신 브라우저)
  if (canvas.toDataURL('image/avif').indexOf('image/avif') === 5) {
    formats.push('avif');
  }

  return formats;
}

// 메모리 사용량 추정
export function estimateMemoryUsage(width: number, height: number): number {
  // RGBA 픽셀당 4바이트 + 압축 오버헤드
  return width * height * 4 * 2; // 2배 오버헤드 고려
}

// 최적 크기 권장
export function recommendOptimalSize(
  originalWidth: number,
  originalHeight: number,
  targetSizeKB: number = 500
): { width: number; height: number; quality: number } {
  const originalPixels = originalWidth * originalHeight;
  const targetPixels = (targetSizeKB * 1024) / 0.5; // 추정 압축률

  if (originalPixels <= targetPixels) {
    return { width: originalWidth, height: originalHeight, quality: 0.85 };
  }

  const scale = Math.sqrt(targetPixels / originalPixels);
  const width = Math.round(originalWidth * scale);
  const height = Math.round(originalHeight * scale);

  return { width, height, quality: 0.85 };
}