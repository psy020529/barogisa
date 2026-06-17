// 장부 도메인 서비스 — Supabase CRUD + 실시간 구독 (피벗)
import type {
  Member,
  Partner,
  PartnerType,
  RateItem,
  UserSettings,
  WorkLog,
  WorkType,
} from '@/types';
import { getSupabase } from './supabase';

// ── 행 매핑 ──────────────────────────────────────────────────────────────────
type PartnerRow = {
  id: string;
  name: string;
  type: PartnerType;
  location: string | null;
  trades: string[];
  contact_name: string | null;
  contact_phone: string | null;
  created_at: string;
  rate_tables?: { id: string; trade: string; daily_rate: number }[];
};

function rowToPartner(r: PartnerRow): Partner {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    location: r.location ?? undefined,
    trades: r.trades ?? [],
    contactName: r.contact_name ?? undefined,
    contactPhone: r.contact_phone ?? undefined,
    rates: r.rate_tables?.map((rt) => ({ id: rt.id, trade: rt.trade, dailyRate: rt.daily_rate })),
    createdAt: new Date(r.created_at).getTime(),
  };
}

type WorkLogRow = {
  id: string;
  partner_id: string;
  date: string;
  work_type: WorkType;
  member_ids: string[];
  days: number;
  unit_rate: number;
  amount: number;
  is_manual: boolean;
  photos: string[];
  memo: string | null;
  payment: 'unpaid' | 'paid';
  paid_at: string | null;
  created_at: string;
  partners?: { name: string } | null;
};

function rowToWorkLog(r: WorkLogRow): WorkLog {
  return {
    id: r.id,
    partnerId: r.partner_id,
    partnerName: r.partners?.name,
    date: r.date,
    workType: r.work_type,
    memberIds: r.member_ids ?? [],
    days: r.days,
    unitRate: r.unit_rate,
    amount: r.amount,
    isManual: r.is_manual,
    photos: r.photos ?? [],
    memo: r.memo ?? undefined,
    payment: r.payment,
    paidAt: r.paid_at ? new Date(r.paid_at).getTime() : undefined,
    createdAt: new Date(r.created_at).getTime(),
  };
}

const uniqueChannel = (() => {
  let n = 0;
  return (p: string) => `${p}:${++n}:${Date.now()}`;
})();

// ── 거래처 ───────────────────────────────────────────────────────────────────
export async function listPartners(): Promise<Partner[]> {
  const { data, error } = await getSupabase()
    .from('partners')
    .select('*, rate_tables(id, trade, daily_rate)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToPartner);
}

export function subscribePartners(cb: (p: Partner[]) => void): () => void {
  const supabase = getSupabase();
  let cancelled = false;
  const reload = () =>
    listPartners().then((p) => !cancelled && cb(p)).catch((e) => console.error('partners reload', e));
  reload();
  const ch = supabase
    .channel(uniqueChannel('partners'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' }, reload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rate_tables' }, reload)
    .subscribe();
  return () => {
    cancelled = true;
    supabase.removeChannel(ch);
  };
}

export async function createPartner(
  input: { name: string; type: PartnerType; location?: string; trades: string[]; contactName?: string; contactPhone?: string },
  ownerId: string,
): Promise<string> {
  const { data, error } = await getSupabase()
    .from('partners')
    .insert({
      owner_id: ownerId,
      name: input.name,
      type: input.type,
      location: input.location ?? null,
      trades: input.trades,
      contact_name: input.contactName ?? null,
      contact_phone: input.contactPhone ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

// 단가표 전체 교체 (행 단위 upsert + 삭제)
export async function saveRates(partnerId: string, rates: RateItem[]): Promise<void> {
  const supabase = getSupabase();
  const clean = rates.filter((r) => r.trade.trim());
  // 기존 삭제 후 재삽입 (행 수 적어 단순화)
  const { error: delErr } = await supabase.from('rate_tables').delete().eq('partner_id', partnerId);
  if (delErr) throw delErr;
  if (clean.length === 0) return;
  const { error } = await supabase
    .from('rate_tables')
    .insert(clean.map((r) => ({ partner_id: partnerId, trade: r.trade.trim(), daily_rate: r.dailyRate })));
  if (error) throw error;
}

// ── 팀원 ─────────────────────────────────────────────────────────────────────
export async function listMembers(): Promise<Member[]> {
  const { data, error } = await getSupabase()
    .from('members')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: { id: string; name: string; phone: string | null; created_at: string }) => ({
    id: r.id,
    name: r.name,
    phone: r.phone ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
  }));
}

export function subscribeMembers(cb: (m: Member[]) => void): () => void {
  const supabase = getSupabase();
  let cancelled = false;
  const reload = () =>
    listMembers().then((m) => !cancelled && cb(m)).catch((e) => console.error('members reload', e));
  reload();
  const ch = supabase
    .channel(uniqueChannel('members'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, reload)
    .subscribe();
  return () => {
    cancelled = true;
    supabase.removeChannel(ch);
  };
}

export async function createMember(name: string, ownerId: string, phone?: string): Promise<string> {
  const { data, error } = await getSupabase()
    .from('members')
    .insert({ owner_id: ownerId, name, phone: phone ?? null })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await getSupabase().from('members').delete().eq('id', id);
  if (error) throw error;
}

// ── 작업 기록 ────────────────────────────────────────────────────────────────
// 월 범위(YYYY-MM-DD ~ )로 조회. month 예: '2026-05'
export async function listWorkLogsByMonth(month: string): Promise<WorkLog[]> {
  const start = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const { data, error } = await getSupabase()
    .from('work_logs')
    .select('*, partners(name)')
    .gte('date', start)
    .lt('date', nextMonth)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToWorkLog);
}

export function subscribeWorkLogsByMonth(month: string, cb: (w: WorkLog[]) => void): () => void {
  const supabase = getSupabase();
  let cancelled = false;
  const reload = () =>
    listWorkLogsByMonth(month).then((w) => !cancelled && cb(w)).catch((e) => console.error('worklogs reload', e));
  reload();
  const ch = supabase
    .channel(uniqueChannel(`worklogs:${month}`))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'work_logs' }, reload)
    .subscribe();
  return () => {
    cancelled = true;
    supabase.removeChannel(ch);
  };
}

// 미수금 전용 (정산/알림) — 월 무관 전체 unpaid
export async function listUnpaidWorkLogs(): Promise<WorkLog[]> {
  const { data, error } = await getSupabase()
    .from('work_logs')
    .select('*, partners(name)')
    .eq('payment', 'unpaid')
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToWorkLog);
}

export type WorkLogInput = {
  partnerId: string;
  date: string;
  workType: WorkType;
  memberIds: string[];
  days: number;
  unitRate: number;
  amount: number;
  isManual: boolean;
  photos?: string[];
  memo?: string;
};

export async function createWorkLog(input: WorkLogInput, ownerId: string): Promise<string> {
  const { data, error } = await getSupabase()
    .from('work_logs')
    .insert({
      owner_id: ownerId,
      partner_id: input.partnerId,
      date: input.date,
      work_type: input.workType,
      member_ids: input.memberIds,
      days: input.days,
      unit_rate: input.unitRate,
      amount: input.amount,
      is_manual: input.isManual,
      photos: input.photos ?? [],
      memo: input.memo ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateWorkLogPayment(id: string, payment: 'unpaid' | 'paid'): Promise<void> {
  const { error } = await getSupabase()
    .from('work_logs')
    .update({ payment, paid_at: payment === 'paid' ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteWorkLog(id: string): Promise<void> {
  const { error } = await getSupabase().from('work_logs').delete().eq('id', id);
  if (error) throw error;
}

// ── 설정 ─────────────────────────────────────────────────────────────────────
export async function getUserSettings(): Promise<UserSettings | null> {
  const { data, error } = await getSupabase()
    .from('user_settings')
    .select('bank_account, account_holder')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { bankAccount: data.bank_account ?? undefined, accountHolder: data.account_holder ?? undefined };
}

export async function saveUserSettings(s: UserSettings, ownerId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('user_settings')
    .upsert({
      owner_id: ownerId,
      bank_account: s.bankAccount ?? null,
      account_holder: s.accountHolder ?? null,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}
