import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants';
import { usePartners } from '@/hooks/useLedger';

// 단가표 탭 — 거래처를 골라 단가를 편집한다 (편집 화면은 거래처 상세와 공유)
export default function RatesScreen() {
  const partners = usePartners();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>단가표</Text>
        <Text style={styles.sub}>거래처를 선택해 공종별 일당을 정합니다</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}>
        {partners.length === 0 && (
          <Text style={styles.empty}>먼저 거래처를 등록하세요.</Text>
        )}
        {partners.map((p) => {
          const count = p.rates?.length ?? 0;
          return (
            <Pressable key={p.id} style={styles.row} onPress={() => router.push(`/partner/${p.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.meta}>
                  {count > 0
                    ? p.rates!.map((r) => `${r.trade} ${Math.round(r.dailyRate / 10000)}만`).join(' · ')
                    : '단가 미설정 — 탭하여 입력'}
                </Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  title: { fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  sub: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textMuted, padding: SPACING.xxl },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  name: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.semibold, color: COLORS.text },
  meta: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: 3 },
  chev: { fontSize: FONT_SIZE.heading, color: COLORS.textLight },
});
