import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '@/constants';

// 통계(요약) 카드 — 라벨(위, 작게) + 값(아래, 크게·강조색).
// 좌측 색 바 ❌. 강조는 값의 색으로만 준다 (docs/DESIGN.md "통계 카드").
type Tone = 'default' | 'primary' | 'success' | 'danger';

const TONE_COLOR: Record<Tone, string> = {
  default: COLORS.text,
  primary: COLORS.primary,
  success: COLORS.success,
  danger: COLORS.danger,
};

export function StatCard({
  label,
  value,
  tone = 'default',
  size = 'sm',
  style,
}: {
  label: string;
  value: string;
  tone?: Tone;
  size?: 'sm' | 'lg';
  style?: ViewStyle;
}) {
  const lg = size === 'lg';
  return (
    <View style={[styles.card, lg ? styles.cardLg : styles.cardSm, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[styles.value, { color: TONE_COLOR[tone], fontSize: lg ? FONT_SIZE.display : FONT_SIZE.heading }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md },
  cardSm: { flex: 1, padding: SPACING.md },
  cardLg: { padding: SPACING.lg },
  label: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted },
  value: { fontWeight: FONT_WEIGHT.extrabold, marginTop: SPACING.xs },
});
