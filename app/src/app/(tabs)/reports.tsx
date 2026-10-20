import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import { CONFIRM_LABEL, useStore } from '@/store';
import { C } from '@/theme';
import { Card, Header, Icon, IconBox, Pill, Screen, T, type IconName } from '@/ui';

export default function Reports() {
  const { confirm, inDone, zones, photos, paid } = useStore();
  const defects = photos.filter((p) => p.stage === 'in').reduce((n, p) => n + p.defects.length, 0);
  const hasOut = photos.some((p) => p.stage === 'out');
  const docs: { t: string; d: string; icon: IconName; pill: string; tone: 'accent' | 'neutral' | 'ok' | 'soft'; bg: string; fg: string; to?: Href }[] = [
    { t: '입주 상태 확인서', d: `사진 ${inDone}장 · 하자 ${defects}건 · PDF`, icon: 'file-text', pill: confirm.status === 'none' ? '미발송' : `임대인 ${CONFIRM_LABEL[confirm.status]}`, tone: confirm.status === 'signed' ? 'ok' : 'accent', bg: C.soft, fg: C.accent, to: '/certificate' },
    { t: '비교 리포트', d: '입주 대비 달라진 부분 분석 · 9,900원', icon: 'repeat', pill: paid.compare ? '발급 완료' : hasOut ? '바로 가능' : '퇴거 사진 필요', tone: paid.compare ? 'ok' : hasOut ? 'soft' : 'neutral', bg: C.sunk, fg: C.muted, to: '/compare' },
    { t: '퇴거 단독 리포트', d: '입주 기록 없이 점검 · 9,900원', icon: 'alert-triangle', pill: paid.only ? '발급 완료' : '바로 가능', tone: 'ok', bg: C.okSoft, fg: C.ok, to: paid.only ? '/payment?key=only' : '/checklist' },
    { t: '분쟁 대응 문서', d: '내용증명 · 조정 신청서 초안', icon: 'edit-3', pill: '준비 중', tone: 'neutral', bg: C.sunk, fg: C.muted },
  ];
  return (
    <Screen gap={10} header={<Header title="리포트" back={false} />}>
      <T size={13} color={C.muted}>필요할 때 언제든 만들 수 있어요 · 구역 {zones.length}곳 기준</T>
      {docs.map((x) => (
        <Card key={x.t} onPress={x.to ? () => router.push(x.to!) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBox name={x.icon} size={44} bg={x.bg} color={x.fg} />
          <View style={{ flex: 1, gap: 3 }}>
            <T size={15} w="b">{x.t}</T>
            <T size={12.5} color={C.muted}>{x.d}</T>
            <Pill label={x.pill} tone={x.tone} />
          </View>
          <Icon name="chevron-right" size={18} color={C.muted} />
        </Card>
      ))}
      <Card onPress={() => router.push('/verify')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconBox name="shield" size={44} bg={C.soft} color={C.accent} />
        <View style={{ flex: 1 }}><T size={15} w="b">원본 검증</T><T size={12.5} color={C.muted}>SHA-256으로 등록된 원본인지 확인해요</T></View>
        <Icon name="chevron-right" size={18} color={C.muted} />
      </Card>
      <Card onPress={() => router.push(confirm.token ? `/c/${confirm.token}` : '/landlord')} style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' }}>
        <View style={{ flex: 1 }}><T size={14} w="b">임대인 화면으로 보기 (시연)</T><T size={12} color={C.muted}>임대인이 받는 확인 링크 화면을 미리 봐요</T></View>
        <Icon name="chevron-right" size={18} color={C.muted} />
      </Card>
    </Screen>
  );
}
