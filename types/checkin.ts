export type CheckType = 'in' | 'out';

export interface CheckRecord {
  id: string;
  jobId: string;
  driverId: string;
  type: CheckType;
  timestamp: number;
  latitude: number;
  longitude: number;
  photoUrl?: string;      // Firebase Storage 업로드 후
  localPhotoUri?: string; // 오프라인 큐 보관용
  syncedAt?: number;      // undefined면 미동기화
}
