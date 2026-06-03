export interface Factory {
  id: string;
  name: string;
  ownerUserId: string;
  contactPhone: string; // 앱 내에서만 노출 (외부 카톡·전화 유도 차단)
  defaultAddress?: string;
  createdAt: number;
}
