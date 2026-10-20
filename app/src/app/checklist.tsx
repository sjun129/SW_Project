import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { CHECKLIST, useStore } from '@/store';
import { C } from '@/theme';
import { Btn, Card, Chip, Footer, Header, Legal, Pill, Row, Screen, T } from '@/ui';

/** FR-20 퇴거 단독 리포트: no move-in record needed; normal-wear checklist + move-out photos. */
export default function Checklist() {
  const { checklist, setChecklist, zones, photosOf } = useStore();
  const outShots = zones.filter((z) => photosOf('out', z.id).length).length;
  const answered = CHECKLIST.filter((c) => c.id in checklist).length;
  const fault = CHECKLIST.filter((c) => checklist[c.id] && !c.wear);
  const set = (id: string, v: boolean) => setChecklist((c) => ({ ...c, [id]: v }));

  return (
    <Screen header={<Header title="퇴거 단독 리포트" />}
      footer={<Footer><Btn label={answered < CHECKLIST.length ? `${CHECKLIST.length - answered}개 더 답해 주세요` : '리포트 받기 · 9,900원'} disabled={answered < CHECKLIST.length} onPress={() => router.push('/payment?key=only')} /></Footer>}>
      <View style={{ gap: 4 }}>
        <T size={20} w="b">통상 손모 체크리스트</T>
        <T size={13} color={C.muted}>통상 손모는 원상복구 대상이 아니라는 판례 기준으로 점검해요 (민법 제615조). 입주 기록이 없어도 받을 수 있어요.</T>
      </View>
      <Card style={{ gap: 4, paddingVertical: 6 }}>
        {CHECKLIST.map((c, i) => (
          <Row key={c.id} gap={8} style={[{ paddingVertical: 10 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <T size={14} w="m">{c.label}</T>
              <T size={11.5} color={c.wear ? C.ok : C.red}>{c.wear ? '통상 손모 (참고)' : '임차인 과실 의심 (참고)'}</T>
            </View>
            <Chip label="없음" on={checklist[c.id] === false} onPress={() => set(c.id, false)} />
            <Chip label="있음" on={checklist[c.id] === true} onPress={() => set(c.id, true)} />
          </Row>
        ))}
      </Card>
      <Pressable onPress={() => router.push({ pathname: '/camera', params: { stage: 'out' } })}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}><T size={14} w="b">퇴거 사진 {outShots}/{zones.length} 구역</T><T size={12} color={C.muted}>사진을 함께 찍으면 리포트에 원본 해시와 함께 들어가요</T></View>
          <Pill label="촬영" tone="soft" />
        </Card>
      </Pressable>
      {fault.length > 0 && <T size={12.5} color={C.red}>과실 의심 {fault.length}건: {fault.map((f) => f.label).join(', ')}</T>}
      <Legal />
    </Screen>
  );
}
