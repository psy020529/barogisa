import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants';

// 카카오(다음) 우편번호 서비스 — 무료, API 키 불필요.
// dooring-admin(견적서)·바로가구의 DaumPostcode 를 RN(WebView)으로 이식.
// 인터페이스(value/placeholder/onComplete)는 dooring-admin 버전과 동일.

export interface DaumPostcodeResult {
  roadAddress: string;
  jibunAddress: string;
  sido: string;
  sigungu: string;
  zonecode: string;
  buildingName: string;
}

interface DaumPostcodeProps {
  /** 현재 선택된 도로명 주소 (버튼에 표시). */
  value: string;
  placeholder?: string;
  onComplete: (result: DaumPostcodeResult) => void;
}

const POSTCODE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>html,body,#container{margin:0;padding:0;width:100%;height:100%;}</style>
</head>
<body>
  <div id="container"></div>
  <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
  <script>
    new daum.Postcode({
      oncomplete: function (data) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          roadAddress: data.roadAddress || data.address,
          jibunAddress: data.jibunAddress,
          sido: data.sido,
          sigungu: data.sigungu,
          zonecode: data.zonecode,
          buildingName: data.buildingName,
        }));
      },
      width: '100%',
      height: '100%',
    }).embed(document.getElementById('container'));
  </script>
</body>
</html>`;

export default function DaumPostcode({ value, placeholder, onComplete }: DaumPostcodeProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable style={styles.button} onPress={() => setOpen(true)}>
        <Text style={value ? styles.buttonValue : styles.buttonPlaceholder}>
          {value || (placeholder ?? '건물명·지번·도로명 검색')}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>주소 검색</Text>
            <Pressable hitSlop={12} onPress={() => setOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <WebView
            source={{ html: POSTCODE_HTML, baseUrl: 'https://barogisa.app' }}
            onMessage={(e) => {
              try {
                const data = JSON.parse(e.nativeEvent.data) as DaumPostcodeResult;
                setOpen(false);
                onComplete(data);
              } catch {
                // 무시 — postcode 외 메시지
              }
            }}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  buttonValue: { fontSize: FONT_SIZE.body, color: COLORS.text },
  buttonPlaceholder: { fontSize: FONT_SIZE.body, color: COLORS.textLight },
  modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 48 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: FONT_SIZE.title, fontWeight: '700', color: COLORS.text },
  modalClose: { fontSize: FONT_SIZE.heading, color: COLORS.textMuted },
});
