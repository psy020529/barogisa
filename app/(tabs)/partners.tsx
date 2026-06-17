import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants';
import { usePartners } from '@/hooks/useLedger';
import { PARTNER_TYPE_LABEL } from '@/types';

export default function PartnersScreen() {
  const partners = usePartners();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>내 거래처</Text>
        <Text style={styles.sub}>{partners.length}곳 등록됨</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xxl }}>
        {partners.length === 0 && (
          <Text style={styles.empty}>등록된 거래처가 없습니다.{'\n'}+ 거래처 등록으로 시작하세요.</Text>
        )}
        {partners.map((p) => (
          <Pressable key={p.id} style={styles.card} onPress={() => router.push(`/partner/${p.id}`)}>
            <View style={styles.cardTop}>
              <Text style={styles.name}>{p.name}</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{PARTNER_TYPE_LABEL[p.type]}</Text>
              </View>
            </View>
            {(p.location || p.trades.length > 0) && (
              <Text style={styles.meta}>
                {[p.location, p.trades.join(', ')].filter(Boolean).join(' · ')}
              </Text>
            )}
            {p.rates && p.rates.length > 0 && (
              <Text style={styles.rate}>
                {p.rates.map((r) => `${r.trade} ${Math.round(r.dailyRate / 10000)}만`).join(' · ')}
              </Text>
            )}
          </Pressable>
        ))}

        <Pressable style={styles.addBtn} onPress={() => router.push('/partner/new')}>
          <Text style={styles.addBtnText}>+ 거래처 등록</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  title: { fontSize: FONT_SIZE.heading, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  sub: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textMuted, padding: SPACING.xxl, lineHeight: 22 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: FONT_SIZE.title, fontWeight: FONT_WEIGHT.bold, color: COLORS.text },
  typeBadge: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 1 },
  typeText: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted },
  meta: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginTop: 6 },
  rate: { fontSize: FONT_SIZE.caption, color: COLORS.text, marginTop: 7, backgroundColor: COLORS.bg, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 5, alignSelf: 'flex-start' },
  addBtn: { marginTop: SPACING.sm, paddingVertical: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: '#fff' },
  addBtnText: { color: COLORS.primary, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.title },
});
