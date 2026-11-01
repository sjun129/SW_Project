import { router } from 'expo-router';
import { Image, Pressable, View } from 'react-native';
import { fmtTime, useStore } from '@/store';
import { C } from '@/theme';
import { Btn, Card, Header, Icon, Pill, Row, Screen, T } from '@/ui';

export default function DefectReports() {
  const { defectReports, photos } = useStore();
  return (
    <Screen gap={12} header={<Header title="하자 신고 내역" right={<Pressable onPress={() => router.push('/defect-report')}><T size={13} w="b" color={C.accent}>새 신고</T></Pressable>} />}>
      {defectReports.length === 0 ? (
        <View style={{ alignItems: 'center', gap: 10, paddingTop: 40 }}>
          <Icon name="clipboard" size={34} color={C.muted} />
          <T size={16} w="b">저장된 하자 신고가 없어요</T>
          <T size={13} color={C.muted} style={{ textAlign: 'center' }}>새로 생긴 문제를 기록해 두면{ '\n' }나중에 다시 확인할 수 있어요.</T>
          <Btn label="하자 신고하기" onPress={() => router.push('/defect-report')} />
        </View>
      ) : defectReports.map((report) => {
        const attached = report.photoIds.map((id) => photos.find((p) => p.id === id)).filter((p) => p !== undefined);
        return (
          <Card key={report.id} style={{ gap: 8 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={15} w="b">{report.place} · {report.category}</T>
              <Pill label={report.repair ? '수리 요청 의사' : '기록만'} tone={report.repair ? 'accent' : 'neutral'} />
            </Row>
            <T size={12} color={C.muted}>{fmtTime(report.time)}</T>
            {!!report.memo && <T size={13.5}>{report.memo}</T>}
            {attached.length > 0 && <Row gap={6} style={{ flexWrap: 'wrap' }}>{attached.map((photo) => <Image key={photo.id} source={photo.src} style={{ width: 64, height: 64, borderRadius: 10 }} />)}</Row>}
          </Card>
        );
      })}
    </Screen>
  );
}
