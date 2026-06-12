import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import DaumPostcode from '@/components/DaumPostcode';
import { COLORS, FONT_SIZE, PROCESS_LABEL, RADIUS, SPACING, STANDARD_RATES } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useJob } from '@/hooks/useJobs';
import { useMyFactory } from '@/hooks/useMyFactory';
import { createJob, updateJob } from '@/services/jobsApi';
import { getSupabase, hasSupabaseConfig } from '@/services/supabase';
import type { JobListingType, JobProcess } from '@/types';

// 베타 공정: 시공·재단·조립만 (청소/수전/용달은 추후)
const PROCESSES: JobProcess[] = ['installation', 'cutting', 'assembly'];

type DriverOption = { id: string; name: string };

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function FactoryRegister() {
  const { user } = useAuth();
  const factory = useMyFactory(user?.id, user?.name);
  // jobId가 있으면 수정 모드 — 같은 폼을 재사용한다
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const editingJob = useJob(jobId || undefined);
  const isEdit = Boolean(jobId);
  const prefilled = useRef(false);

  const [listingType, setListingType] = useState<JobListingType>('open');
  const [date, setDate] = useState(todayIso());
  const [showCalendar, setShowCalendar] = useState(false);
  const [process, setProcess] = useState<JobProcess>('installation');
  const [roadAddress, setRoadAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [amountOverride, setAmountOverride] = useState<string>('');

  // 수정 모드: 기존 일감 값으로 폼 1회 채움
  useEffect(() => {
    if (!editingJob || prefilled.current) return;
    prefilled.current = true;
    setListingType(editingJob.listingType);
    setDate(editingJob.date);
    setProcess(editingJob.process);
    setRoadAddress(editingJob.address);
    setDriverId(editingJob.driverId ?? null);
    setNotes(editingJob.notes ?? '');
    setAmountOverride(String(editingJob.amount));
  }, [editingJob]);

  // 실제 users에서 기사·관리자 목록 로드 (DEMO 하드코딩 제거)
  useEffect(() => {
    if (!hasSupabaseConfig) return;
    let cancelled = false;
    (async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .or('role.eq.driver,is_admin.eq.true')
        .order('name');
      if (cancelled) return;
      if (error) {
        console.error('drivers load error', error);
        return;
      }
      const list = (data ?? []) as DriverOption[];
      setDrivers(list);
      // 본인이 admin이면 본인을 기본 선택 (자가 테스트 편의)
      const selfFirst = list.find((d) => d.id === user?.id) ?? list[0];
      if (selfFirst) setDriverId(selfFirst.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // 장거리 판정은 발주가 아니라 기사 출발지 기준 (일감 상세에서 기사에게 표시)
  const amount = STANDARD_RATES[process];
  const finalAmount = amountOverride ? Number(amountOverride.replace(/[^0-9]/g, '')) : amount;

  const submit = async () => {
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }
    if (!factory.factoryId || !factory.factoryName) {
      Alert.alert('오류', '공장 정보가 아직 준비되지 않았습니다.');
      return;
    }
    if (listingType === 'direct' && !driverId) {
      Alert.alert('확인', '기사를 선택하세요.');
      return;
    }
    if (!roadAddress.trim()) {
      Alert.alert('확인', '주소 검색으로 주소를 선택하세요.');
      return;
    }
    const fullAddress = [roadAddress.trim(), detailAddress.trim()].filter(Boolean).join(' ');
    if (!finalAmount || finalAmount <= 0) {
      Alert.alert('확인', '단가를 확인하세요.');
      return;
    }
    const driver = listingType === 'direct' ? drivers.find((d) => d.id === driverId) : undefined;
    if (listingType === 'direct' && !driver) return;

    if (isEdit && jobId) {
      try {
        await updateJob(jobId, {
          date,
          process,
          address: fullAddress,
          amount: finalAmount,
          notes: notes.trim() || undefined,
          // 기사 변경은 지명 발주에서만 (공개 모집 건은 선택 흐름으로 배정)
          ...(listingType === 'direct' && driver ? { driverId: driver.id } : {}),
        });
        Alert.alert('수정 완료', '일감 정보를 수정했습니다.', [
          { text: '확인', onPress: () => router.back() },
        ]);
      } catch (e) {
        Alert.alert('수정 실패', e instanceof Error ? e.message : String(e));
      }
      return;
    }

    try {
      await createJob({
        factoryId: factory.factoryId,
        factoryName: factory.factoryName,
        driverId: driver?.id,
        listingType,
        date,
        process,
        address: fullAddress,
        amount: finalAmount,
        notes: notes.trim() || undefined,
      });
      Alert.alert(
        '등록 완료',
        listingType === 'direct'
          ? `${driver!.name}에게 발주했습니다.`
          : '공개 모집으로 등록했습니다. 기사들이 지원하면 선택할 수 있습니다.',
        [{ text: '확인', onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert('등록 실패', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← 닫기</Text>
        </Pressable>
        <Text style={styles.title}>{isEdit ? '일감 수정' : '일감 발주'}</Text>
        {factory.factoryName && (
          <Text style={styles.subtitle}>{factory.factoryName}</Text>
        )}
        {isEdit && editingJob && (editingJob.status === 'accepted' || editingJob.status === 'confirmed') && (
          <View style={styles.editWarn}>
            <Text style={styles.editWarnText}>
              ⚠ 기사가 이미 {editingJob.status === 'accepted' ? '수락' : '확정'}한 일감입니다.
              변경 내용을 기사에게 따로 알려주세요.
            </Text>
          </View>
        )}

        {!isEdit && (
        <Field label="모집 방식">
          <View style={styles.row}>
            <Pressable
              style={[styles.chip, listingType === 'open' && styles.chipActive]}
              onPress={() => setListingType('open')}
            >
              <Text style={[styles.chipText, listingType === 'open' && styles.chipTextActive]}>
                공개 모집
              </Text>
            </Pressable>
            <Pressable
              style={[styles.chip, listingType === 'direct' && styles.chipActive]}
              onPress={() => setListingType('direct')}
            >
              <Text style={[styles.chipText, listingType === 'direct' && styles.chipTextActive]}>
                기사 지명
              </Text>
            </Pressable>
          </View>
          {listingType === 'open' && (
            <Text style={styles.note}>조건이 맞는 기사들이 지원하면 그중에서 선택합니다.</Text>
          )}
        </Field>
        )}

        <Field label="시공 날짜">
          <Pressable style={styles.input} onPress={() => setShowCalendar(true)}>
            <Text style={styles.dateText}>{date}</Text>
          </Pressable>
        </Field>

        <Modal visible={showCalendar} transparent animationType="fade">
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCalendar(false)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <Calendar
                current={date}
                minDate={todayIso()}
                markedDates={{ [date]: { selected: true, selectedColor: COLORS.primary } }}
                onDayPress={(day: { dateString: string }) => {
                  setDate(day.dateString);
                  setShowCalendar(false);
                }}
                theme={{
                  todayTextColor: COLORS.primary,
                  arrowColor: COLORS.primary,
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>

        <Field label="공정">
          <View style={styles.row}>
            {PROCESSES.map((p) => (
              <Pressable
                key={p}
                style={[styles.chip, process === p && styles.chipActive]}
                onPress={() => setProcess(p)}
              >
                <Text style={[styles.chipText, process === p && styles.chipTextActive]}>
                  {PROCESS_LABEL[p]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="시공 주소">
          <DaumPostcode
            value={roadAddress}
            placeholder="주소 검색 — 건물명·지번·도로명"
            onComplete={(r) => setRoadAddress(r.roadAddress)}
          />
          <TextInput
            style={[styles.input, { marginTop: SPACING.xs }]}
            value={detailAddress}
            onChangeText={setDetailAddress}
            placeholder="상세주소 (예: 101동 501호)"
          />
        </Field>

        {listingType === 'direct' && (
          <Field label="지정 기사">
            {drivers.length === 0 ? (
              <Text style={styles.note}>등록된 기사가 없습니다</Text>
            ) : (
              <View style={styles.row}>
                {drivers.map((d) => (
                  <Pressable
                    key={d.id}
                    style={[styles.chip, driverId === d.id && styles.chipActive]}
                    onPress={() => setDriverId(d.id)}
                  >
                    <Text style={[styles.chipText, driverId === d.id && styles.chipTextActive]}>
                      {d.name}
                      {d.id === user?.id && ' (나)'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Field>
        )}

        <Field label={`단가 (표준 ${amount.toLocaleString()}원, 수정 가능)`}>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={amountOverride || String(amount)}
            onChangeText={setAmountOverride}
          />
        </Field>

        <Field label="비고">
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="(선택) 특이사항"
          />
        </Field>

        <Pressable style={styles.submit} onPress={submit}>
          <Text style={styles.submitText}>
            {isEdit ? '수정 저장' : listingType === 'direct' ? '발주하기' : '공개 모집 등록'}
          </Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  backText: { fontSize: FONT_SIZE.body, color: COLORS.primary, paddingVertical: SPACING.sm },
  title: { fontSize: FONT_SIZE.heading, fontWeight: '700', color: COLORS.text, marginTop: SPACING.sm },
  subtitle: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginBottom: SPACING.lg },
  field: { marginBottom: SPACING.md },
  fieldLabel: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.body,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  note: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, paddingVertical: SPACING.sm },
  dateText: { fontSize: FONT_SIZE.body, color: COLORS.text },
  editWarn: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFF4E5',
    marginBottom: SPACING.md,
  },
  editWarnText: { fontSize: FONT_SIZE.caption, color: COLORS.warning, fontWeight: '600' },
  searchBtn: {
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '600' },
  addrError: { fontSize: FONT_SIZE.caption, color: COLORS.danger, marginTop: SPACING.xs },
  candidate: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
    backgroundColor: '#fff',
  },
  candidateRoad: { fontSize: FONT_SIZE.body, color: COLORS.text },
  candidateJibun: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: 2 },
  travelBox: {
    marginTop: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: '#EEF4FB',
  },
  travelText: { fontSize: FONT_SIZE.caption, color: COLORS.primary, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZE.body, color: COLORS.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  submit: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: FONT_SIZE.title, fontWeight: '700' },
});
