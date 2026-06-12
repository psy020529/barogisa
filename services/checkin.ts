import * as FileSystem from 'expo-file-system/legacy';
import type { CheckRecord, CheckType, JobStatus } from '@/types';
import { updateJobStatus } from './jobsApi';
import { getSupabase, hasSupabaseConfig } from './supabase';

// 체크인/아웃 기록 — 실 Supabase 연동 (베타 스프린트 B).
//  1) 사진이 있으면 Storage(checkin-photos/{driverId}/...) 업로드 — 실패해도 체크인은 진행
//  2) check_records insert (uuid 발급)
//  3) jobs 상태 전이 + check_in_id/check_out_id 기록
// 정책: GPS·사진이 없거나 업로드가 실패해도 체크인 자체는 반드시 성공시킨다 (기록 우선).
// TODO(스프린트 B 후속): 오프라인 큐 — 네트워크 단절 시 AsyncStorage 보관 후 자동 동기화.

type CheckInput = Omit<CheckRecord, 'id' | 'syncedAt'>;

async function uploadPhoto(input: CheckInput): Promise<string | undefined> {
  if (!input.localPhotoUri) return undefined;
  try {
    const supabase = getSupabase();
    const path = `${input.driverId}/${input.jobId}-${input.type}-${input.timestamp}.jpg`;
    const base64 = await FileSystem.readAsStringAsync(input.localPhotoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const { error } = await supabase.storage
      .from('checkin-photos')
      .upload(path, bytes.buffer as ArrayBuffer, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    return path;
  } catch (e) {
    // 사진 업로드 실패는 체크인을 막지 않는다 — 누락으로 기록
    console.warn('checkin photo upload failed (continuing without photo):', e);
    return undefined;
  }
}

export async function saveCheckRecord(input: CheckInput): Promise<CheckRecord> {
  if (!hasSupabaseConfig) return saveMock(input);

  const supabase = getSupabase();
  const photoPath = await uploadPhoto(input);

  const { data, error } = await supabase
    .from('check_records')
    .insert({
      job_id: input.jobId,
      driver_id: input.driverId,
      type: input.type,
      timestamp: new Date(input.timestamp).toISOString(),
      latitude: input.latitude,
      longitude: input.longitude,
      photo_url: photoPath ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;

  const nextStatus: JobStatus = input.type === 'in' ? 'checked_in' : 'completed';
  const patch = input.type === 'in' ? { checkInId: data.id } : { checkOutId: data.id };
  await updateJobStatus(input.jobId, nextStatus, patch);

  return { ...input, id: data.id, photoUrl: photoPath, syncedAt: Date.now() };
}

// ── Supabase 미설정 시 mock (dev 모드) ──────────────────────────────────────
const mockRecords: CheckRecord[] = [];

async function saveMock(input: CheckInput): Promise<CheckRecord> {
  const record: CheckRecord = { ...input, id: `chk-${Date.now()}`, syncedAt: undefined };
  mockRecords.push(record);
  const nextStatus: JobStatus = input.type === 'in' ? 'checked_in' : 'completed';
  const patch = input.type === 'in' ? { checkInId: record.id } : { checkOutId: record.id };
  await updateJobStatus(input.jobId, nextStatus, patch);
  return record;
}

export function getRecords(): CheckRecord[] {
  return [...mockRecords];
}

export type { CheckType };
