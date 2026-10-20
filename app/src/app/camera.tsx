import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SAMPLE, STAGE_LABEL, useStore, type Stage } from '@/store';
import { C } from '@/theme';
import { Btn, Icon, T } from '@/ui';

const ORDER: Stage[] = ['in', 'live', 'out'];

export default function Camera() {
  const p = useLocalSearchParams<{ stage?: Stage; zone?: string }>();
  const { zones, photosOf, addPhoto } = useStore();
  const [stage, setStage] = useState<Stage>(p.stage ?? 'in');
  const [zone, setZone] = useState(p.zone ?? zones[0].id);
  const [perm, requestPerm] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const cam = useRef<CameraView>(null);
  const z = zones.find((x) => x.id === zone) ?? zones[0];
  const last = photosOf(stage).at(-1);

  // Only in-app capture is allowed (FR-04): no gallery picker anywhere in this flow.
  const save = async (src: Parameters<typeof addPhoto>[2], uri: string | null) => {
    setBusy(true);
    try {
      const photo = await addPhoto(z.id, stage, src, uri);
      router.replace({ pathname: '/tagging', params: { id: photo.id } });
    } finally { setBusy(false); }
  };
  const shoot = async () => {
    const pic = await cam.current?.takePictureAsync({ quality: 0.8 });
    if (pic?.uri) await save({ uri: pic.uri }, pic.uri);
  };
  const useSample = () => save(z.id === 'floor' || z.id === 'entry' ? SAMPLE.floor : SAMPLE.wall, null);

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
            <T size={13} color="#fff" style={{ textAlign: 'center' }}>카메라 권한이 없어요.{'\n'}권한을 허용하거나 샘플 사진으로 시연할 수 있어요.</T>
            <Btn label="카메라 권한 허용" kind="soft" onPress={requestPerm} style={{ flexGrow: 0, alignSelf: 'stretch' }} />
          </View>
        )}
        <View pointerEvents="none" style={cs.guide}>
          <View style={cs.tip}><T size={14} w="b" color="#fff">{z.name}</T><T size={12} color="#fff">{z.tip}</T></View>
        </View>
      </View>

      <SafeAreaView edges={['bottom']} style={{ backgroundColor: C.photo }}>
        <View style={cs.bottom}>
          <View style={cs.thumb}>{last && <Image source={last.src} style={{ width: '100%', height: '100%' }} />}</View>
          <Pressable accessibilityLabel="촬영" disabled={busy || !perm?.granted || !ready} onPress={shoot} style={[cs.shutter, (!perm?.granted || !ready) && { opacity: 0.4 }]}>
            {busy ? <ActivityIndicator color={C.accent} /> : <View style={cs.shutterInner} />}
          </Pressable>
          <Pressable onPress={useSample} disabled={busy} style={{ alignItems: 'center', gap: 2, width: 56 }}>
            <Icon name="image" size={20} color="#fff" /><T size={10} w="m" color="#fff">샘플 사진</T>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, paddingBottom: 10 }}>
          <Icon name="lock" size={12} color="rgba(255,255,255,0.7)" /><T size={11} color="rgba(255,255,255,0.7)">촬영 즉시 해시와 서버 시각으로 원본을 고정해요 · 갤러리 업로드 불가</T>
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
  tip: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingTop: 18, paddingBottom: 10 },
  thumb: { width: 52, height: 52, borderRadius: 12, overflow: 'hidden', backgroundColor: '#454C5C' },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
});
