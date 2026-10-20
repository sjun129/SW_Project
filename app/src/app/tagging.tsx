import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { short } from '@/hash';
import { fmtTime, uid, useStore } from '@/store';
import { C } from '@/theme';
import { Btn, Chip, Footer, Header, Icon, Legal, Row, Screen, T, TaggedPhoto } from '@/ui';

const LABELS = ['곰팡이', '찢김', '스크래치', '얼룩'];

export default function Tagging() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { photos, zones, updateDefects, photosOf } = useStore();
  const photo = photos.find((p) => p.id === id);
  const [label, setLabel] = useState(LABELS[0]);
  if (!photo) return <Screen header={<Header title="사진 없음" />}><T color={C.muted}>사진을 찾을 수 없어요.</T></Screen>;
  const zone = zones.find((z) => z.id === photo.zoneId);
  const nextZone = zones.find((z) => !photosOf(photo.stage, z.id).length);

  const addAt = (x: number, y: number) => updateDefects(photo.id, [...photo.defects, { id: uid(), label, x: Math.max(0, x - 0.08), y: Math.max(0, y - 0.08), w: 0.16, h: 0.16, source: 'user' }]);
  const remove = (did: string) => updateDefects(photo.id, photo.defects.filter((d) => d.id !== did));

  return (
    <Screen gap={12}
      header={<Header title={`${zone?.name ?? ''} · 하자 확인`} right={
        <Pressable onPress={() => router.replace({ pathname: '/camera', params: { stage: photo.stage, zone: photo.zoneId } })}><Row gap={4}><Icon name="rotate-ccw" size={15} color={C.muted} /><T size={13} w="m" color={C.muted}>다시 찍기</T></Row></Pressable>
      } />}
      footer={<Footer>
        <Btn kind="ghost" label="다른 구역 찍기" onPress={() => router.replace({ pathname: '/camera', params: { stage: photo.stage, zone: nextZone?.id ?? photo.zoneId } })} />
        <Btn label="저장" onPress={() => (router.canGoBack() ? router.back() : router.replace('/records'))} />
      </Footer>}>
      <TaggedPhoto src={photo.src} defects={photo.defects} height={268} onPressAt={addAt} />
      <T size={12.5} color={C.muted}>AI가 찾은 하자를 확인하세요. 틀린 건 지우고, 빠진 곳은 라벨을 고른 뒤 사진을 눌러 추가할 수 있어요.</T>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>{LABELS.map((l) => <Chip key={l} label={l} on={l === label} onPress={() => setLabel(l)} />)}</Row>
      <View style={{ backgroundColor: C.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4 }}>
        {photo.defects.length === 0 && <T size={13} color={C.muted} style={{ paddingVertical: 12 }}>표시된 하자가 없어요.</T>}
        {photo.defects.map((d) => (
          <Row key={d.id} gap={8} style={{ paddingVertical: 12 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.source === 'user' ? '#4FC3FF' : C.tag }} />
            <T size={14} w="m" style={{ flex: 1 }}>{d.label}</T>
            <T size={12} color={C.muted}>{d.source === 'ai' ? `AI ${d.conf}%` : '직접 추가'}</T>
            <Pressable hitSlop={8} onPress={() => remove(d.id)}><T size={12.5} w="m" color={C.red}>삭제</T></Pressable>
          </Row>
        ))}
      </View>
      <Row gap={10} style={{ backgroundColor: C.okSoft, borderRadius: 14, padding: 12 }}>
        <Icon name="lock" size={18} color={C.ok} />
        <View style={{ flex: 1 }}>
          <T size={13} w="b" color={C.ok}>원본 고정 완료 · 서버 해시 일치{photo.sample ? ' (샘플)' : ''}</T>
          <T size={11.5} w="mono" color={C.ok}>{short(photo.hash)} · {fmtTime(photo.serverTs)}</T>
        </View>
      </Row>
      <Legal />
    </Screen>
  );
}
