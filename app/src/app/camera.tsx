import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { errText, SAMPLE, STAGE_LABEL, useStore, type Stage } from '@/store';
import { C } from '@/theme';
import { Btn, Icon, T } from '@/ui';

const ORDER: Stage[] = ['in', 'live', 'out'];
// Example framing per zone, matched by name so user-added zones like "작은방 벽지" also get one.
const GUIDES: [string, number][] = [
  ['현관', require('../../assets/img/guide-entry.png')], ['벽', require('../../assets/img/guide-wall.png')],
  ['바닥', require('../../assets/img/guide-floor.png')], ['욕실', require('../../assets/img/guide-bath.png')],
  ['창', require('../../assets/img/guide-window.png')], ['가전', require('../../assets/img/guide-appliance.png')],
];
const guideFor = (name = '') => GUIDES.find(([k]) => name.includes(k))?.[1];

export default function Camera() {
  const p = useLocalSearchParams<{ stage?: Stage; zone?: string }>();
  const { zones, photosOf, addPhoto, mode } = useStore();
  const [stage, setStage] = useState<Stage>(p.stage ?? 'in');
  const [zone, setZone] = useState(p.zone ?? zones[0]?.id ?? '');
  const [err, setErr] = useState('');
  const [perm, requestPerm] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const cam = useRef<CameraView>(null);
  const z = zones.find((x) => x.id === zone) ?? (zones[0] as (typeof zones)[number] | undefined);
  const last = photosOf(stage).at(-1);
  const ref = z ? photosOf('in', z.id).at(-1) : undefined;
  const guide = guideFor(z?.name);

  // Only in-app capture is allowed (FR-04): no gallery picker anywhere in this flow.
  const save = async (src: Parameters<typeof addPhoto>[2], uri: string | null) => {
    if (!z) return setErr('먼저 구역을 추가해 주세요.');
    setBusy(true); setErr('');
    try {
      const photo = await addPhoto(z.id, stage, src, uri);
      router.replace({ pathname: '/tagging', params: { id: photo.id } });
    } catch (e) { setErr(`저장하지 못했어요: ${errText(e)}`); } finally { setBusy(false); }
  };
  const shoot = async () => {
    const pic = await cam.current?.takePictureAsync({ quality: 0.8 });
    if (pic?.uri) await save({ uri: pic.uri }, pic.uri);
  };
  const useSample = () => {
    if (mode === 'remote') {
      setErr('샘플 사진은 데모 모드에서만 쓸 수 있어요. 서버에 남기는 증거는 직접 촬영해 주세요.');
      return;
    }
    void save(z && ['바닥', '현관'].includes(z.name) ? SAMPLE.floor : SAMPLE.wall, null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.photo }}>
      <SafeAreaView edges={['top']}>
        <View style={cs.top}>
          <Pressable accessibilityLabel="닫기" hitSlop={10} onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}><Icon name="x" size={24} color="#fff" /></Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setStage(ORDER[(ORDER.indexOf(stage) + 1) % 3])} style={cs.stage}><T size={12} w="b" color="#fff">{STAGE_LABEL[stage]} 기록 ▾</T></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingBottom: 12 }}>
          {zones.map((x) => {
            const on = x.id === zone; const done = photosOf(stage, x.id).length > 0;
            return (
              <Pressable key={x.id} onPress={() => setZone(x.id)} style={[cs.chip, on && cs.chipOn]}>
                <T size={12.5} w={on ? 'b' : 'm'} color={on ? C.accent : '#fff'}>{done ? '✓ ' : ''}{x.name}</T>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <View style={cs.viewport}>
        {perm?.granted ? (
          <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setReady(true)} />
        ) : (
          <View style={{ alignItems: 'center', gap: 12, padding: 24 }}>
            <Icon name="camera-off" size={28} color="#fff" />
            <T size={13} color="#fff" style={{ textAlign: 'center' }}>{mode === 'demo'
              ? <>카메라 권한이 없어요.{'\n'}권한을 허용하거나 샘플 사진으로 시연할 수 있어요.</>
              : <>카메라 권한이 없어요.{'\n'}권한을 허용해야 서버에 원본 증거를 저장할 수 있어요.</>}</T>
            <Btn label="카메라 권한 허용" kind="soft" onPress={requestPerm} style={{ flexGrow: 0, alignSelf: 'stretch' }} />
          </View>
        )}
        {stage === 'out' && ref && <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={ref.src} style={{ width: '100%', height: '100%', opacity: 0.35 }} resizeMode="cover" /></View>}
        {!(stage === 'out' && ref) && guide && (
          <View pointerEvents="none" style={cs.example}>
            <Image source={guide} style={{ width: 96, height: 72, borderRadius: 6 }} />
            <T size={10} w="m" color="#fff" style={{ textAlign: 'center' }}>예시 구도</T>
          </View>
        )}
        {busy && <View style={cs.busy}><ActivityIndicator color="#fff" /><T size={13} w="m" color="#fff">원본을 고정하고 AI가 사진을 살펴보는 중…</T></View>}
        <View pointerEvents="none" style={cs.guide}>
          <View style={cs.tip}><T size={14} w="b" color="#fff">{z?.name ?? '구역 없음'}</T><T size={12} color="#fff">{stage === 'out' && ref ? '입주 사진을 반투명하게 겹쳤어요. 같은 구도로 맞춰 찍으세요' : z?.tip ?? '기록 탭에서 구역을 추가해 주세요'}</T></View>
        </View>
      </View>

      <SafeAreaView edges={['bottom']} style={{ backgroundColor: C.photo }}>
        <View style={cs.bottom}>
          <View style={cs.thumb}>{last && <Image source={last.src} style={{ width: '100%', height: '100%' }} />}</View>
          <Pressable accessibilityLabel="촬영" disabled={busy || !perm?.granted || !ready} onPress={shoot} style={[cs.shutter, (!perm?.granted || !ready) && { opacity: 0.4 }]}>
            {busy ? <ActivityIndicator color={C.accent} /> : <View style={cs.shutterInner} />}
          </Pressable>
          {mode === 'demo' ? (
            <Pressable onPress={useSample} disabled={busy} style={{ alignItems: 'center', gap: 2, width: 56 }}>
              <Icon name="image" size={20} color="#fff" /><T size={10} w="m" color="#fff">샘플 사진</T>
            </Pressable>
          ) : <View style={{ width: 56 }} />}
        </View>
        {!!err && <T size={12} color="#FFB4B4" style={{ textAlign: 'center', paddingHorizontal: 16 }}>{err}</T>}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, paddingBottom: 10 }}>
          <Icon name="lock" size={12} color="rgba(255,255,255,0.7)" /><T size={11} color="rgba(255,255,255,0.7)">{mode === 'remote' ? '실제 촬영만 서버 증거로 고정 · 갤러리 업로드 불가' : '촬영 즉시 해시를 계산해요 · 샘플로 시연 가능'}</T>
        </View>
      </SafeAreaView>
    </View>
  );
}

const cs = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  stage: { backgroundColor: C.accent, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: C.soft, borderColor: C.soft },
  viewport: { flex: 1, backgroundColor: '#1F2430', alignItems: 'center', justifyContent: 'center' },
  guide: { position: 'absolute', top: '8%', bottom: '8%', left: '9%', right: '9%', borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.8)', borderRadius: 12, alignItems: 'center', justifyContent: 'flex-end', padding: 14 },
  example: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, padding: 6, gap: 4 },
  busy: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 2 },
  tip: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingTop: 18, paddingBottom: 10 },
  thumb: { width: 52, height: 52, borderRadius: 12, overflow: 'hidden', backgroundColor: '#454C5C' },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
});
