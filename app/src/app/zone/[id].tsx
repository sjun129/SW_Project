import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { CONFIRM_LABEL, fmtTime, STAGE_LABEL, useStore, type Stage } from '@/store';
import { C } from '@/theme';
import { Btn, Card, Footer, Header, IconBox, Pill, Row, Screen, T } from '@/ui';

const HINT: Record<Stage, string> = { in: '입주 날의 상태를 남겨 두세요', live: '살다가 생긴 변화를 언제든 남겨 두세요', out: '계약 만료 30일 전에 알려 드려요' };

export default function ZoneDetail() {
  const { id, stage } = useLocalSearchParams<{ id: string; stage?: Stage }>();
  const { zones, photosOf, confirm } = useStore();
  const zone = zones.find((z) => z.id === id);
  if (!zone) return <Screen header={<Header title="구역 없음" />}><T color={C.muted}>구역을 찾을 수 없어요.</T></Screen>;
  const all = (['in', 'live', 'out'] as Stage[]).map((k) => ({ k, ps: photosOf(k, zone.id) }));
  const total = all.reduce((n, x) => n + x.ps.length, 0);
  const defects = all.reduce((n, x) => n + x.ps.reduce((m, p) => m + p.defects.length, 0), 0);
  const shoot = (k: Stage) => router.push({ pathname: '/camera', params: { stage: k, zone: zone.id } });

  return (
    <Screen header={<Header title={zone.name} />} footer={<Footer><Btn label="이 구역 촬영하기" icon="camera" onPress={() => shoot(stage ?? 'in')} /></Footer>}>
      <Row gap={6}><Pill label={`사진 ${total}장`} />{defects > 0 && <Pill label={`하자 ${defects}건`} tone="red" />}<Pill label={`임대인 ${CONFIRM_LABEL[confirm.status]}`} tone="accent" /></Row>
      {all.map(({ k, ps }) => (
        <Card key={k} style={{ gap: 10 }}>
          <Row gap={6}><T size={15} w="b">{STAGE_LABEL[k]}</T>{ps[0] && <T size={12} w="mono" color={C.muted}>{fmtTime(ps[0].serverTs)}</T>}</Row>
          {ps.length ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {ps.map((p) => (
                  <Pressable key={p.id} onPress={() => router.push({ pathname: '/tagging', params: { id: p.id } })}>
                    <Image source={p.src} style={{ width: 150, height: 112, borderRadius: 12, backgroundColor: C.photo }} />
                  </Pressable>
                ))}
              </ScrollView>
              <T size={12.5} color={C.muted}>{ps.reduce((n, p) => n + p.defects.length, 0) ? ps.flatMap((p) => p.defects.map((d) => d.label)).join(', ') : '하자 없음'} · 원본 고정</T>
            </>
          ) : (
            <Pressable onPress={() => shoot(k)}>
              <Row gap={10} style={{ backgroundColor: C.bg, borderRadius: 12, padding: 14 }}><IconBox name="plus" size={36} /><T size={12.5} color={C.muted} style={{ flex: 1 }}>{HINT[k]}</T></Row>
            </Pressable>
          )}
        </Card>
      ))}
      <View />
    </Screen>
  );
}
