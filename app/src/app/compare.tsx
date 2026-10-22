import { router } from 'expo-router';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { errText, SAMPLE, useStore, type Defect } from '@/store';
import { C } from '@/theme';
import { Btn, Card, Footer, Header, Legal, Mascot, Pill, Row, Screen, T, TaggedPhoto } from '@/ui';

/** Reference classification only (FR-16); never presented as a legal conclusion. */
const classify = (zoneName: string, d: Defect) =>
  d.label === '곰팡이' && zoneName === '욕실 실리콘'
    ? { label: '통상 손모 가능성', tone: 'ok' as const, why: '사용에 따른 자연 발생일 수 있어요' }
    : { label: '임차인 과실 의심', tone: 'red' as const, why: '입주 기록에 없던 손상이에요' };

export default function Compare() {
  const { zones, photosOf, addPhoto, paid, mode } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pairs = zones.map((z) => ({ z, a: photosOf('in', z.id).at(-1), b: photosOf('out', z.id).at(-1) })).filter((x) => x.a && x.b);
  const changes = pairs.map((x) => ({ ...x, diff: x.b!.defects.filter((d) => !x.a!.defects.some((o) => o.label === d.label && Math.abs(o.x - d.x) < 0.05)) }));
  const changed = changes.filter((x) => x.diff.length);

  // Demo helper: fill move-out photos for zones that already have move-in photos.
  const demoFill = async () => {
    if (mode !== 'demo') return;
    setBusy(true);
    try {
    for (const z of zones.filter((z) => photosOf('in', z.id).length && !photosOf('out', z.id).length)) {
      await addPhoto(z.id, 'out', ['바닥', '현관'].includes(z.name) ? SAMPLE.floor : SAMPLE.wall, null);
    }
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };

  if (!pairs.length) return (
    <Screen header={<Header title="비교 결과" />}>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 40 }}>
        <Mascot name="search" size={96} />
        <T size={18} w="b">아직 비교할 퇴거 사진이 없어요</T>
        <T size={13} color={C.muted} style={{ textAlign: 'center' }}>입주 때 찍은 구역을 퇴거 전에 같은 구도로 찍으면{'\n'}달라진 부분을 찾아 드려요.</T>
      </View>
      <Btn label="퇴거 사진 찍기" icon="camera" onPress={() => router.push({ pathname: '/camera', params: { stage: 'out' } })} />
      {mode === 'demo' && <Btn label={busy ? '채우는 중…' : '샘플 퇴거 사진으로 채우기 (시연)'} kind="soft" disabled={busy} onPress={demoFill} />}
      {!!err && <T size={12.5} color={C.red}>{err}</T>}
    </Screen>
  );

  return (
    <Screen gap={12} header={<Header title="비교 결과" />}
      footer={<Footer><Btn label={paid.compare ? '발급된 리포트 보기' : '비교 리포트 받기 · 9,900원'} onPress={() => router.push('/payment?key=compare')} /></Footer>}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
        <Mascot name="search" size={52} />
        <View style={{ flex: 1 }}><T size={15} w="b">{changed.length}개 구역에서 변화가 보여요</T><T size={12.5} color={C.muted}>입주 사진과 나란히 놓고 비교했어요</T></View>
      </Card>
      {changes.map(({ z, a, b, diff }) => {
        const c = diff[0] && classify(z.name, diff[0]);
        return (
          <Card key={z.id} style={{ gap: 10, padding: 14 }}>
            <Row style={{ justifyContent: 'space-between' }}><T size={15} w="b">{z.name}</T>{c ? <Pill label={c.label} tone={c.tone} /> : <Pill label="변화 없음" tone="ok" />}</Row>
            <Row gap={6}>
              <View style={{ flex: 1 }}><Image source={a!.src} style={{ height: 120, borderRadius: 12, width: '100%' }} /><Tag t="입주" /></View>
              <View style={{ flex: 1 }}><TaggedPhoto src={b!.src} defects={diff} height={120} radius={12} diff /><Tag t="퇴거" /></View>
            </Row>
            {c && <T size={12.5} color={C.muted}>{diff.map((d) => d.label).join(', ')} · {c.why}</T>}
          </Card>
        );
      })}
      <Legal />
    </Screen>
  );
}

const Tag = ({ t }: { t: string }) => (
  <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}><T size={11} w="b" color="#fff">{t}</T></View>
);
