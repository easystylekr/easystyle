// 로컬 이미지 저장 및 백그라운드 업로드 시스템
import { uploadBase64Image } from './storage';
import { supabase } from './supabaseClient';

export interface LocalImageRecord {
  id: string;
  originalImage: {
    base64: string;
    mimeType: string;
  };
  styledImage?: {
    base64: string;
    mimeType: string;
  };
  metadata: {
    userPrompt: string;
    userAnswer: string;
    fullPrompt: string;
    description: string;
    modelProvider: string;
    timestamp: number;
    userId?: string;
  };
  uploadStatus: {
    original: 'pending' | 'uploading' | 'completed' | 'failed';
    styled: 'pending' | 'uploading' | 'completed' | 'failed';
  };
  uploadedPaths?: {
    original?: string;
    styled?: string;
  };
}

// 로컬 저장소 관리
class LocalImageStorageManager {
  private storageKey = 'easystyle_local_images';
  private uploadQueue: Set<string> = new Set();

  // 로컬에 이미지 저장
  saveLocally(record: Omit<LocalImageRecord, 'id' | 'uploadStatus'>): string {
    const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullRecord: LocalImageRecord = {
      id,
      ...record,
      uploadStatus: {
        original: 'pending',
        styled: record.styledImage ? 'pending' : 'completed'
      }
    };

    // 로컬스토리지에 저장
    const existing = this.getLocalRecords();
    existing.push(fullRecord);

    // 최대 10개만 유지 (오래된 것부터 삭제)
    if (existing.length > 10) {
      existing.splice(0, existing.length - 10);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(existing));
    console.log('📱 [LocalStorage] Image saved locally:', { id, timestamp: fullRecord.metadata.timestamp });

    // 백그라운드 업로드 시작
    this.scheduleBackgroundUpload(id);

    return id;
  }

  // 로컬 기록 조회
  getLocalRecords(): LocalImageRecord[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse local records:', error);
      return [];
    }
  }

  // 특정 기록 조회
  getLocalRecord(id: string): LocalImageRecord | null {
    const records = this.getLocalRecords();
    return records.find(r => r.id === id) || null;
  }

  // 로컬 기록 업데이트
  updateLocalRecord(id: string, updates: Partial<LocalImageRecord>): void {
    const records = this.getLocalRecords();
    const index = records.findIndex(r => r.id === id);
    if (index !== -1) {
      records[index] = { ...records[index], ...updates };
      localStorage.setItem(this.storageKey, JSON.stringify(records));
    }
  }

  // 백그라운드 업로드 스케줄링
  private scheduleBackgroundUpload(id: string): void {
    if (this.uploadQueue.has(id)) {
      console.log('📤 [BackgroundUpload] Already queued:', id);
      return;
    }

    this.uploadQueue.add(id);

    // 5초 후 업로드 시작 (사용자 경험 최우선)
    setTimeout(() => {
      this.performBackgroundUpload(id);
    }, 5000);
  }

  // 실제 백그라운드 업로드 수행
  private async performBackgroundUpload(id: string): Promise<void> {
    const record = this.getLocalRecord(id);
    if (!record) {
      console.warn('📤 [BackgroundUpload] Record not found:', id);
      this.uploadQueue.delete(id);
      return;
    }

    console.log('📤 [BackgroundUpload] Starting upload for:', id);

    try {
      // 사용자 정보 가져오기
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id || 'anon';
      const ts = record.metadata.timestamp;
      const bucket = 'styling';

      const origExt = (record.originalImage.mimeType?.split('/')?.[1] || 'png').toLowerCase();
      const paths = {
        orig: `${uid}/${ts}/original.${origExt}`,
        styled: `${uid}/${ts}/styled.png`,
      };

      // 원본 이미지 업로드
      if (record.uploadStatus.original === 'pending') {
        console.log('📤 [BackgroundUpload] Uploading original image...');
        this.updateLocalRecord(id, {
          uploadStatus: { ...record.uploadStatus, original: 'uploading' }
        });

        const uploadedOrig = await uploadBase64Image(
          bucket,
          paths.orig,
          record.originalImage.base64,
          record.originalImage.mimeType
        );

        if (uploadedOrig?.path) {
          this.updateLocalRecord(id, {
            uploadStatus: { ...record.uploadStatus, original: 'completed' },
            uploadedPaths: { ...record.uploadedPaths, original: uploadedOrig.path }
          });
          console.log('✅ [BackgroundUpload] Original image uploaded');
        } else {
          throw new Error('Original image upload failed');
        }
      }

      // 스타일 이미지 업로드
      if (record.styledImage && record.uploadStatus.styled === 'pending') {
        console.log('📤 [BackgroundUpload] Uploading styled image...');
        this.updateLocalRecord(id, {
          uploadStatus: { ...record.uploadStatus, styled: 'uploading' }
        });

        const uploadedStyled = await uploadBase64Image(
          bucket,
          paths.styled,
          record.styledImage.base64,
          record.styledImage.mimeType
        );

        if (uploadedStyled?.path) {
          this.updateLocalRecord(id, {
            uploadStatus: { ...record.uploadStatus, styled: 'completed' },
            uploadedPaths: { ...record.uploadedPaths, styled: uploadedStyled.path }
          });
          console.log('✅ [BackgroundUpload] Styled image uploaded');
        } else {
          throw new Error('Styled image upload failed');
        }
      }

      // 세션 기록 저장
      const updatedRecord = this.getLocalRecord(id);
      if (updatedRecord?.uploadedPaths) {
        console.log('💾 [BackgroundUpload] Recording session...');
        const { recordStyleSession } = await import('./productStorageService');

        await recordStyleSession({
          userPrompt: record.metadata.userPrompt,
          userAnswer: record.metadata.userAnswer,
          fullPrompt: record.metadata.fullPrompt,
          description: record.metadata.description,
          modelProvider: record.metadata.modelProvider,
          originalImagePath: updatedRecord.uploadedPaths.original,
          styledImagePath: updatedRecord.uploadedPaths.styled,
        });

        console.log('✅ [BackgroundUpload] Session recorded successfully');
      }

      console.log('🎉 [BackgroundUpload] Complete upload finished for:', id);

    } catch (error) {
      console.error('❌ [BackgroundUpload] Upload failed:', error);

      // 실패 상태로 업데이트
      this.updateLocalRecord(id, {
        uploadStatus: {
          original: record.uploadStatus.original === 'uploading' ? 'failed' : record.uploadStatus.original,
          styled: record.uploadStatus.styled === 'uploading' ? 'failed' : record.uploadStatus.styled
        }
      });

      // 30초 후 재시도
      setTimeout(() => {
        console.log('🔄 [BackgroundUpload] Retrying upload for:', id);
        this.performBackgroundUpload(id);
      }, 30000);

      return;
    } finally {
      this.uploadQueue.delete(id);
    }
  }

  // 업로드 상태 확인
  getUploadStatus(id: string): LocalImageRecord['uploadStatus'] | null {
    const record = this.getLocalRecord(id);
    return record?.uploadStatus || null;
  }

  // 수동 업로드 트리거 (재시도용)
  triggerUpload(id: string): void {
    console.log('🔄 [ManualUpload] Triggering upload for:', id);
    this.scheduleBackgroundUpload(id);
  }

  // 로컬 데이터 정리 (옵션)
  cleanup(): void {
    const records = this.getLocalRecords();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const cleaned = records.filter(r => {
      const isRecent = r.metadata.timestamp > weekAgo;
      const isCompleted = r.uploadStatus.original === 'completed' &&
                         (r.uploadStatus.styled === 'completed' || !r.styledImage);

      return isRecent || !isCompleted;
    });

    localStorage.setItem(this.storageKey, JSON.stringify(cleaned));
    console.log(`🧹 [LocalStorage] Cleaned up ${records.length - cleaned.length} old records`);
  }
}

// 싱글톤 인스턴스
export const localImageStorage = new LocalImageStorageManager();

// 페이지 로드 시 정리 작업 스케줄링
if (typeof window !== 'undefined') {
  // 10분 후 정리 작업 실행
  setTimeout(() => {
    localImageStorage.cleanup();
  }, 10 * 60 * 1000);
}