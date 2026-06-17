import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useMembers, usePartners } from '@/hooks/useLedger';
import { createMember, createWorkLog } from '@/services/ledger';
import { WORK_TYPE_LABEL, type WorkType } from '@/types';
import { formatCurrency } from '@/utils/format';

const WORK_TYPES: WorkType[] = ['install', 'measure', 'cut', 'as'];
const todayIso = () => new Date().toISOString().slice(0, 10);

export default function WorkNew() {
  const { user } = useAuth();
  const partners = usePartners();
  const members = useMembers();

  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [rateIdx, setRateIdx] = useState(0); // 선택한 공종(단가) 인덱스
  const [manualRate, setManualRate] = useState(''); // 단가 없는 거래처용
  const [workType, setWorkType] = useState<WorkType>('install');
  const [date, setDate] = useState(todayIso());
  const [showCal, setShowCal] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [newMember, setNewMember] = useState('');
  const [days, setDays] = useState('1');
  const [memo, setMemo] = useState('');
  const [amountOverride, setAmountOverride] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const partner = partners.find((p) => p.id === partnerId);
  const rates = partner?.rates ?? [];
  const unitRate = rates.length > 0 ? rates[rateIdx]?.dailyRate ?? 0 : Number(manualRate.replace(/[^0-9]/g, '')) || 0;
  const daysN = Math.max(1, Number(days.replace(/[^0-9]/g, '')) || 1);
  const computed = unitRate * memberIds.length * daysN;
  const amount = amountOverride != null ? Number(amountOverride.replace(/[^0-9]/g, '')) || 0 : computed;
  const isManual = amountOverride != null;

  const toggleMember = (id: string) =>
    setMemberIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const addMember = async () => {
    if (!user) return;
    const n = newMember.trim();
    if (!n) return;
    try {
      const id = await createMember(n, user.id);
      setMemberIds((cur) => [...cur, id]);
      setNewMember('');
    } catch (e) {
      Alert.alert('팀원 추가 실패', e instanceof Error ? e.message : String(e));
    }
  };

  const submit = async () => {
    if (!user) return;
    if (!partnerId) return Alert.alert('확인', '거래처를 선택하세요.');
    if (memberIds.length === 0) return Alert.alert('확인', '투입 팀원을 1명 이상 선택하세요.');
    if (amount <= 0) return Alert.alert('확인', '금액을 확인하세요. (단가 미설정 시 직접 입력)');
    setBusy(true);
    try {
      await createWorkLog(
        {
          partnerId,
          date,
          workType,
          memberIds,
          days: daysN,
          unitRate,
          amount,
          isManual,
          memo: memo.trim() || undefined,
        },
        user.id,
      );
      router.replace('/(tabs)/calendar');
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const formula = useMemo(
    () => `${unitRate >= 10000 ? Math.round(unitRate / 10000) + '만' : unitRate} × ${memberIds.length}명 × ${daysN}일`,
    [unitRate, memberIds.length, daysN],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xxl }}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ 취소</Text>
        </Pressable>
        <Text style={styles.title}>작업 기록 추가</Text>

        {/* 거래처 */}
        <Field label="거래처 *">
          {partners.length === 0 ? (
            <Pressable onPress={() => router.push('/partner/new')}>
              <Text style={styles.link}>+ 먼저 거래처를 등록하세요</Text>
            </Pressable>
          ) : (
            <View style={styles.chips}>
              {partners.map((p) => (
                <Chip
                  key={p.id}
                  on={partnerId === p.id}
                  label={p.name}
                  onPress={() => {
                    setPartnerId(p.id);
                    setRateIdx(0);
                    setAmountOverride(null);
                  }}
                />
              ))}
            </View>
          )}
        </Field>

        {/* 공종/단가 */}
        {partner && (
          <Field label="공종 · 단가">
            {rates.length > 0 ? (
              <View style={styles.chips}>
                {rates.map((r, i) => (
                  <Chip
                    key={r.trade}
                    on={rateIdx === i}
                    label={`${r.trade} ${Math.round(r.dailyRate / 10000)}만`}
                    onPress={() => {
                      setRateIdx(i);
                      setAmountOverride(null);
                    }}
                  />
                ))}
              </View>
            ) : (
              <>
                <Text style={styles.warn}>이 거래처는 단가가 없습니다. 일당을 직접 입력하거나 단가표를 설정하세요.</Text>
                <View style={styles.inlineRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={manualRate}
                    onChangeText={(v) => {
                      setManualRate(v);
                      setAmountOverride(null);
                    }}
                    keyboardType="numeric"
                    placeholder="1인 1일 일당"
                  />
                  <Pressable style={styles.ghostBtn} onPress={() => router.push(`/partner/${partner.id}`)}>
                    <Text style={styles.ghostBtnText}>단가표</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Field>
        )}

        {/* 작업 유형 */}
        <Field label="작업 유형">
          <View style={styles.chips}>
            {WORK_TYPES.map((t) => (
              <Chip key={t} on={workType === t} label={WORK_TYPE_LABEL[t]} onPress={() => setWorkType(t)} />
            ))}
          </View>
        </Field>

        {/* 날짜 */}
        <Field label="날짜">
          <Pressable style={styles.input} onPress={() => setShowCal(true)}>
            <Text style={styles.dateText}>{date}</Text>
          </Pressable>
        </Field>
        <Modal visible={showCal} transparent animationType="fade">
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCal(false)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <Calendar
                current={date}
                markedDates={{ [date]: { selected: true, selectedColor: COLORS.primary } }}
                onDayPress={(d: { dateString: string }) => {
                  setDate(d.dateString);
                  setShowCal(false);
                }}
                theme={{ todayTextColor: COLORS.primary, arrowColor: COLORS.primary }}
              />
            </Pressable>
          </Pressable>
        </Modal>

        {/* 팀원 */}
        <Field label="투입 팀원 *">
          <View style={styles.chips}>
            {members.map((m) => (
              <Chip key={m.id} on={memberIds.includes(m.id)} label={m.name} onPress={() => toggleMember(m.id)} />
            ))}
          </View>
          <View style={styles.inlineRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={newMember}
              onChangeText={setNewMember}
              placeholder="새 팀원 이름"
              onSubmitEditing={addMember}
            />
            <Pressable style={styles.ghostBtn} onPress={addMember}>
              <Text style={styles.ghostBtnText}>추가</Text>
            </Pressable>
          </View>
        </Field>

        {/* 일수 */}
        <Field label="일수">
          <TextInput style={styles.input} value={days} onChangeText={setDays} keyboardType="numeric" />
        </Field>

        {/* 금액 자동계산 */}
        <View style={styles.calcBox}>
          <View>
            <Text style={styles.calcLabel}>합산 금액 {isManual ? '(수기)' : '(자동)'}</Text>
            <Text style={styles.calcFormula}>{formula}</Text>
          </View>
          <Text style={styles.calcVal}>{formatCurrency(amount)}</Text>
        </View>
        <TextInput
          style={[styles.input, { marginTop: SPACING.sm }]}
          value={amountOverride ?? ''}
          onChangeText={(v) => setAmountOverride(v === '' ? null : v)}
          keyboardType="numeric"
          placeholder="금액 수기 보정 (비우면 자동값)"
        />

        {/* 메모 */}
        <Field label="메모 (선택)">
          <TextInput
            style={[styles.input, { height: 70 }]}
            value={memo}
            onChangeText={setMemo}
            multiline
            placeholder="현장명·특이사항 등"
          />
        </Field>

        <Pressable style={[styles.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          <Text style={styles.submitText}>{busy ? '저장 중...' : '저장'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}
function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, on && styles.chipOn]} onPress={onPress}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  back: { fontSize: FONT_SIZE.body, color: COLORS.primary, paddingVertical: SPACING.sm, fontWeight: FONT_WEIGHT.semibold },
  title: { fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.bold, color: COLORS.text, marginBottom: SPACING.lg },
  field: { marginBottom: SPACING.lg },
  fieldLabel: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  dateText: { fontSize: FONT_SIZE.body, color: COLORS.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#fff' },
  chipOn: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  chipText: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  chipTextOn: { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  inlineRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm },
  ghostBtn: { paddingHorizontal: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  ghostBtnText: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
  link: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold, paddingVertical: SPACING.sm },
  warn: { fontSize: FONT_SIZE.caption, color: COLORS.warning, marginBottom: SPACING.xs },
  calcBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.primarySurface,
  },
  calcLabel: { fontSize: FONT_SIZE.caption, color: COLORS.primary },
  calcFormula: { fontSize: FONT_SIZE.caption, color: COLORS.primary, marginTop: 2, opacity: 0.8 },
  calcVal: { fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.extrabold, color: COLORS.primary },
  submit: { marginTop: SPACING.lg, paddingVertical: SPACING.lg, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold },
  modalBackdrop: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', padding: SPACING.lg },
  modalCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.sm },
});
