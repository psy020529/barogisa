import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, LONG_DISTANCE_SURCHARGE, PROCESS_LABEL, RADIUS, SPACING, STANDARD_RATES } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { createJob } from '@/services/jobsApi';
import type { JobProcess } from '@/types';

// MVP: 실제 기사 디렉토리 연동 전, 데모용 기사 후보 목록.
const DEMO_DRIVERS = [
  { id: 'dev-driver-1', name: '김기사 (시공)' },
  { id: 'dev-driver-2', name: '박기사 (시공)' },
  { id: 'dev-driver-3', name: '이기사 (재단)' },
];

const PROCESSES: JobProcess[] = ['installation', 'cutting', 'assembly', 'cleaning', 'faucet', 'delivery'];

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function FactoryRegister() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayIso());
  const [process, setProcess] = useState<JobProcess>('installation');
  const [address, setAddress] = useState('');
  const [driverId, setDriverId] = useState(DEMO_DRIVERS[0].id);
  const [longDistance, setLongDistance] = useState(false);
  const [notes, setNotes] = useState('');

  const baseRate = STANDARD_RATES[process];
  const amount = useMemo(
    () => baseRate + (longDistance ? LONG_DISTANCE_SURCHARGE : 0),
    [baseRate, longDistance],
  );
  const [amountOverride, setAmountOverride] = useState<string>('');

  const finalAmount = amountOverride ? Number(amountOverride.replace(/[^0-9]/g, '')) : amount;

  const submit = async () => {
    if (!user || !user.factoryProfile) {
      Alert.alert('오류', '공장 계정만 일감을 등록할 수 있습니다.');
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
    const driver = DEMO_DRIVERS.find((d) => d.id === driverId)!;
    try {
      await createJob({
        factoryId: user.factoryProfile.factoryId,
        factoryName: user.name,
        driverId: driver.id,
        date,
        process,
        address: address.trim(),
        amount: finalAmount,
        longDistance: longDistance || undefined,
        notes: notes.trim() || undefined,
      });
      Alert.alert('등록 완료', `${driver.name}에게 발주했습니다.`, [
        { text: '확인', onPress: () => router.back() },
      ]);
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

        <Field label="시공 날짜 (YYYY-MM-DD)">
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2026-05-20" />
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

        <Field label="지정 기사">
          <View style={styles.row}>
            {DEMO_DRIVERS.map((d) => (
              <Pressable
                key={d.id}
                style={[styles.chip, driverId === d.id && styles.chipActive]}
                onPress={() => setDriverId(d.id)}
              >
                <Text style={[styles.chipText, driverId === d.id && styles.chipTextActive]}>{d.name}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

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
          <Text style={styles.submitText}>발주하기</Text>
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
  title: { fontSize: FONT_SIZE.heading, fontWeight: '700', color: COLORS.text, marginTop: SPACING.sm, marginBottom: SPACING.lg },
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
