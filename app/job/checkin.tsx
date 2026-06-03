import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import { useJob } from '@/hooks/useJobs';
import { saveCheckRecord } from '@/services/checkin';

export default function CheckinScreen() {
  const { jobId, type } = useLocalSearchParams<{ jobId: string; type: 'in' | 'out' }>();
  const checkType = type ?? 'in';
  const { user } = useAuth();
  const job = useJob(jobId);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('위치 권한이 거부되어 GPS 확인이 불가합니다.');
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation(loc);
      } catch {
        setLocationError('위치 정보를 가져올 수 없습니다.');
      }
    })();
  }, []);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '카메라 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (!job || !user) return;
    if (!location && !locationError) {
      Alert.alert('잠시만요', 'GPS 확인 중입니다.');
      return;
    }
    if (!photoUri) {
      const skip = await new Promise<boolean>((resolve) => {
        Alert.alert(
          '사진 없음',
          checkType === 'in' ? '시공 시작 사진 없이 체크인하시겠습니까?' : '완료 사진 없이 체크아웃하시겠습니까?',
          [
            { text: '취소', style: 'cancel', onPress: () => resolve(false) },
            { text: '진행', onPress: () => resolve(true) },
          ],
        );
      });
      if (!skip) return;
    }

    setSubmitting(true);
    try {
      await saveCheckRecord({
        jobId: job.id,
        driverId: user.id,
        type: checkType,
        timestamp: Date.now(),
        latitude: location?.coords.latitude ?? 0,
        longitude: location?.coords.longitude ?? 0,
        localPhotoUri: photoUri ?? undefined,
      });
      router.replace('/(tabs)/calendar');
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSubmitting(false);
    }
  };

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.muted}>일감을 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const title = checkType === 'in' ? '체크인 (시공 시작)' : '체크아웃 (시공 완료)';

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: SPACING.lg }}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← 닫기</Text>
        </Pressable>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{job.factoryName} · {job.address}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>GPS</Text>
          {!location && !locationError && <ActivityIndicator />}
          {locationError && <Text style={styles.error}>{locationError}</Text>}
          {location && (
            <Text style={styles.cardValue}>
              {location.coords.latitude.toFixed(5)}, {location.coords.longitude.toFixed(5)}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{checkType === 'in' ? '시공 시작 사진' : '완료 사진'}</Text>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <Text style={styles.muted}>사진 없음</Text>
          )}
          <Pressable style={styles.photoBtn} onPress={takePhoto}>
            <Text style={styles.photoBtnText}>{photoUri ? '다시 촬영' : '사진 촬영'}</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.submitBtn, { backgroundColor: checkType === 'in' ? COLORS.primary : COLORS.success }]}
          onPress={submit}
          disabled={submitting}
        >
          <Text style={styles.submitText}>
            {submitting ? '저장 중...' : checkType === 'in' ? '체크인 완료' : '체크아웃 완료'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  backText: { fontSize: FONT_SIZE.body, color: COLORS.primary, paddingVertical: SPACING.sm },
  title: { marginTop: SPACING.sm, fontSize: FONT_SIZE.heading, fontWeight: '700', color: COLORS.text },
  subtitle: { marginTop: 4, color: COLORS.textMuted },
  card: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
  },
  cardLabel: { fontSize: FONT_SIZE.caption, color: COLORS.textMuted, marginBottom: SPACING.xs },
  cardValue: { fontSize: FONT_SIZE.body, color: COLORS.text },
  muted: { color: COLORS.textMuted },
  error: { color: COLORS.danger },
  photo: { width: '100%', height: 180, borderRadius: RADIUS.sm, marginTop: SPACING.sm },
  photoBtn: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  photoBtnText: { color: COLORS.primary, fontWeight: '600' },
  submitBtn: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: FONT_SIZE.title, fontWeight: '700' },
});
