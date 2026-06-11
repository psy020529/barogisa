import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, LONG_DISTANCE_SURCHARGE, PROCESS_LABEL, RADIUS, SPACING, STANDARD_RATES } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useMyFactory } from '@/hooks/useMyFactory';
import { createJob } from '@/services/jobsApi';
import { getSupabase, hasSupabaseConfig } from '@/services/supabase';
import type { JobListingType, JobProcess } from '@/types';

const PROCESSES: JobProcess[] = ['installation', 'cutting', 'assembly', 'cleaning', 'faucet', 'delivery'];

type DriverOption = { id: string; name: string };

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function FactoryRegister() {
  const { user } = useAuth();
  const factory = useMyFactory(user?.id, user?.name);

  const [listingType, setListingType] = useState<JobListingType>('direct');
  const [date, setDate] = useState(todayIso());
  const [process, setProcess] = useState<JobProcess>('installation');
  const [address, setAddress] = useState('');
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [longDistance, setLongDistance] = useState(false);
  const [notes, setNotes] = useState('');
  const [amountOverride, setAmountOverride] = useState<string>('');

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

  const baseRate = STANDARD_RATES[process];
  const amount = useMemo(
    () => baseRate + (longDistance ? LONG_DISTANCE_SURCHARGE : 0),
    [baseRate, longDistance],
  );

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
    if (!address.trim()) {
      Alert.alert('확인', '주소를 입력하세요.');
      return;
    }
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('확인', '날짜를 YYYY-MM-DD 형식으로 입력하세요.');
      return;
    }
    if (!finalAmount || finalAmount <= 0) {
      Alert.alert('확인', '단가를 확인하세요.');
      return;
    }
    const driver = listingType === 'direct' ? drivers.find((d) => d.id === driverId) : undefined;
    if (listingType === 'direct' && !driver) return;
    try {
      await createJob({
        factoryId: factory.factoryId,
        factoryName: factory.factoryName,
        driverId: driver?.id,
        listingType,
        date,
        process,
        address: address.trim(),
        amount: finalAmount,
        longDistance: longDistance || undefined,
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
        <Text style={styles.title}>일감 발주</Text>
        {factory.factoryName && (
          <Text style={styles.subtitle}>{factory.factoryName}</Text>
        )}

        <Field label="모집 방식">
          <View style={styles.row}>
            <Pressable
              style={[styles.chip, listingType === 'direct' && styles.chipActive]}
              onPress={() => setListingType('direct')}
            >
              <Text style={[styles.chipText, listingType === 'direct' && styles.chipTextActive]}>
                기사 지명
              </Text>
            </Pressable>
            <Pressable
              style={[styles.chip, listingType === 'open' && styles.chipActive]}
              onPress={() => setListingType('open')}
            >
              <Text style={[styles.chipText, listingType === 'open' && styles.chipTextActive]}>
                공개 모집
              </Text>
            </Pressable>
          </View>
          {listingType === 'open' && (
            <Text style={styles.note}>조건이 맞는 기사들이 지원하면 그중에서 선택합니다.</Text>
          )}
        </Field>

        <Field label="시공 날짜 (YYYY-MM-DD)">
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2026-06-15" />
        </Field>

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
          <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="예: 서울시 강남구 ..." />
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

        <View style={[styles.field, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <Text style={styles.fieldLabel}>장거리 추가 (+{LONG_DISTANCE_SURCHARGE.toLocaleString()}원)</Text>
          <Switch value={longDistance} onValueChange={setLongDistance} />
        </View>

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
            {listingType === 'direct' ? '발주하기' : '공개 모집 등록'}
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
