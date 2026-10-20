import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { CONFIRM_LABEL, fmtTime, useStore } from '@/store';
import { C } from '@/theme';
import { Card, Icon, IconBox, LOGO_COMPACT, Mascot, Row, Screen, Section, T, type IconName } from '@/ui';

export default function Home() {
  const st = useStore();
  const { lease, dDay, inDone, zones, confirm, notis } = st;
  const remaining = zones.length - inDone;
  const unread = notis.some((n) => n.unread);
  const actions: { t: string; sub: string; icon: IconName; color: string; go: () => void }[] = [
    { t: '입주 기록', sub: `${inDone}/${zones.length} 완료`, icon: 'camera', color: C.accent, go: () => router.push('/records') },
    { t: '하자 신고', sub: '언제든 기록', icon: 'alert-triangle', color: C.muted, go: () => router.push('/defect-report') },
    { t: '임대인 확인', sub: confirm.status === 'none' ? '아직 안 보냄' : CONFIRM_LABEL[confirm.status], icon: 'edit-3', color: confirm.status === 'signed' ? C.ok : confirm.status === 'none' ? C.red : C.accent, go: () => router.push('/certificate') },
    { t: '퇴거 비교', sub: `${dDay}일 남음`, icon: 'repeat', color: C.muted, go: () => router.push('/compare') },
  ];
  return (
    <Screen pad={20} gap={24}
      header={
        <View style={hs.header}>
          <Image source={LOGO_COMPACT} style={{ width: 92, height: 30 }} resizeMode="contain" />
          <View style={{ flex: 1 }} />
          <Pressable accessibilityLabel="알림" onPress={() => router.push('/notifications')}>
            <Icon name="bell" size={22} />
            {unread && <View style={hs.dot} />}
          </Pressable>
        </View>
      }>
      <View style={{ gap: 12 }}>
        <View style={hs.lease}>
          <Pressable onPress={() => router.push('/myhome')}><Row gap={2}><T size={13} w="m" color="rgba(255,255,255,0.8)">{lease.address}</T><Icon name="chevron-down" size={14} color="rgba(255,255,255,0.8)" /></Row></Pressable>
          <Row gap={4} center={false} style={{ alignItems: 'baseline', marginTop: 4 }}><T size={32} w="k" color="#fff" style={{ lineHeight: 40 }}>{lease.deposit}</T><T size={17} w="b" color="#fff">원</T></Row>
          <T size={13} color="rgba(255,255,255,0.7)">보증금을 지키는 중이에요</T>
          <View style={hs.stats}>
            {[['계약 만료', `D-${dDay}`], ['입주 기록', `${inDone}/${zones.length}`], ['임대인 확인', confirm.status === 'none' ? '대기' : CONFIRM_LABEL[confirm.status]]].map(([k, v], i) => (
              <View key={k} style={[hs.stat, i > 0 && hs.statDivider]}>
                <T size={11.5} color="rgba(255,255,255,0.7)">{k}</T>
                <T size={16} w="b" color="#fff">{v}</T>
              </View>
            ))}
          </View>
        </View>
        {!st.suggestionHidden && remaining > 0 && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }} onPress={() => router.push('/records')}>
            <Mascot name="think" size={48} />
            <View style={{ flex: 1 }}>
              <T size={14.5} w="b">남은 {remaining}개 구역 촬영하기</T>
              <T size={12.5} color={C.muted}>다 찍으면 확인서를 보낼 수 있어요</T>
            </View>
            <Pressable hitSlop={10} accessibilityLabel="추천 닫기" onPress={() => st.setSuggestionHidden(true)}><Icon name="x" size={18} color={C.muted} /></Pressable>
          </Card>
        )}
      </View>

      <Section title="바로가기">
        <View style={hs.grid}>
          {actions.map((a) => (
            <Pressable key={a.t} onPress={a.go} style={({ pressed }) => [hs.tile, pressed && { opacity: 0.85 }]}>
              <IconBox name={a.icon} />
              <View><T size={15} w="b">{a.t}</T><T size={12.5} w="m" color={a.color}>{a.sub}</T></View>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="최근 활동" link="전체 보기" onLink={() => router.push('/notifications')}>
        <View style={hs.recent}>
          {st.activity.slice(0, 3).map((a, i) => (
            <Row key={a.id} gap={10} style={[{ paddingVertical: 14 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent }} />
              <Row gap={6} style={{ flex: 1 }}><T size={14} w="m">{a.title}</T>{a.detail && <T size={12.5} color={a.detail.includes('하자') ? C.red : C.muted}>{a.detail}</T>}</Row>
              <T size={12} w="mono" color={C.muted}>{fmtTime(a.time).slice(-5)}</T>
            </Row>
          ))}
        </View>
      </Section>
    </Screen>
  );
}

const hs = StyleSheet.create({
  header: { height: 60, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 18 },
  dot: { position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderRadius: 4, backgroundColor: C.red, borderWidth: 1.5, borderColor: C.surface },
  lease: { backgroundColor: C.accent, borderRadius: 22, padding: 20, paddingBottom: 18, gap: 2 },
  stats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 12, marginTop: 14, alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.18)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '47.5%', flexGrow: 1, height: 112, backgroundColor: C.surface, borderRadius: 18, padding: 16, justifyContent: 'space-between' },
  recent: { backgroundColor: C.surface, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 4 },
});
