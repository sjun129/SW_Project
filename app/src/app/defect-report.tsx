import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, Switch, TextInput, View } from 'react-native';
import { errText, useStore } from '@/store';
import { C, FONT } from '@/theme';
import { Btn, Chip, Footer, Header, Icon, Row, Screen, T } from '@/ui';

const CATS = ['누수', '곰팡이', '고장', '파손', '기타'];
const PLACES = ['욕실', '주방', '현관', '방'];
const MAX_PHOTOS = 5;

export default function DefectReport() {
  const { addDefectReport, photos } = useStore();
  const [cat, setCat] = useState('고장');
  const [place, setPlace] = useState('욕실');
  const [memo, setMemo] = useState('');
  const [repair, setRepair] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const knownLiveIds = useRef(new Set(photos.filter((p) => p.stage === 'live').map((p) => p.id)));
  const livePhotos = photos.filter((p) => p.stage === 'live');
  const selectedPhotos = selectedIds.map((id) => livePhotos.find((p) => p.id === id)).filter((p) => p !== undefined);
  const availablePhotos = livePhotos.filter((p) => !selectedIds.includes(p.id));

  // The camera flow saves into the shared store before returning to this screen.
  useEffect(() => {
    const currentLive = photos.filter((p) => p.stage === 'live');
    const fresh = currentLive.filter((p) => !knownLiveIds.current.has(p.id));
    if (fresh.length) {
      knownLiveIds.current = new Set(currentLive.map((p) => p.id));
      setSelectedIds((ids) => [...ids, ...fresh.map((p) => p.id)].slice(0, MAX_PHOTOS));
    }
  }, [photos]);

  const togglePhoto = (id: string) => setSelectedIds((ids) => ids.includes(id)
    ? ids.filter((value) => value !== id)
    : ids.length < MAX_PHOTOS ? [...ids, id] : ids);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try { await addDefectReport({ category: cat, place, memo, repair, photoIds: selectedIds }); router.back(); }
    catch (e) { setErr(errText(e)); setSaving(false); }
  };
  return (
    <Screen header={<Header title="하자 신고" right={<Pressable onPress={() => router.push('/defect-reports')}><T size={13} w="b" color={C.accent}>신고 내역</T></Pressable>} />} footer={<Footer><Btn label={saving ? '저장 중…' : '신고 저장'} onPress={save} disabled={saving} /></Footer>}>
      <T size={14} w="b">사진 첨부 <T size={12} color={C.muted}>{selectedIds.length}/{MAX_PHOTOS}</T></T>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {selectedPhotos.map((p) => (
          <Pressable key={p.id} accessibilityRole="button" accessibilityLabel="첨부 사진 삭제" onPress={() => togglePhoto(p.id)} style={{ position: 'relative' }}>
            <Image source={p.src} style={{ width: 88, height: 88, borderRadius: 14 }} />
            <View style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#111a', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={14} color="#fff" /></View>
          </Pressable>
        ))}
        {selectedIds.length < MAX_PHOTOS && (
          <Pressable onPress={() => router.push({ pathname: '/camera', params: { stage: 'live' } })} style={{ width: 88, height: 88, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Icon name="camera" size={22} color={C.muted} /><T size={11} w="m" color={C.muted}>사진 촬영</T>
          </Pressable>
        )}
      </Row>
      {availablePhotos.length > 0 && <>
        <T size={12} color={C.muted}>거주 기록에서 첨부할 사진을 선택할 수 있어요.</T>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {availablePhotos.map((p) => (
            <Pressable key={p.id} accessibilityRole="button" accessibilityLabel="사진 첨부" onPress={() => togglePhoto(p.id)} disabled={selectedIds.length >= MAX_PHOTOS} style={{ opacity: selectedIds.length >= MAX_PHOTOS ? 0.45 : 1 }}>
              <Image source={p.src} style={{ width: 64, height: 64, borderRadius: 10 }} />
            </Pressable>
          ))}
        </Row>
      </>}
      <T size={14} w="b">어떤 문제인가요?</T>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>{CATS.map((c) => <Chip key={c} label={c} on={c === cat} onPress={() => setCat(c)} />)}</Row>
      <T size={14} w="b">어디인가요?</T>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>{PLACES.map((c) => <Chip key={c} label={c} on={c === place} onPress={() => setPlace(c)} />)}</Row>
      <T size={14} w="b">메모</T>
      <TextInput nativeID="defect-memo" multiline value={memo} onChangeText={setMemo} placeholder="예: 보일러 온수가 미지근하게 나와요. 10월 20일부터." placeholderTextColor={C.muted}
        style={{ backgroundColor: C.field, borderRadius: 12, padding: 16, minHeight: 96, textAlignVertical: 'top', fontFamily: FONT.r, fontSize: 14, lineHeight: 21, color: C.ink, includeFontPadding: false }} />
      <Row gap={12} style={{ backgroundColor: C.surface, borderRadius: 14, padding: 14 }}>
        <View style={{ flex: 1 }}><T size={14} w="b">수리 요청 의사 표시</T><T size={12} color={C.muted}>신고에 수리 요청 의사를 기록해요</T></View>
        <Switch value={repair} onValueChange={setRepair} trackColor={{ true: C.accent, false: C.line }} thumbColor="#fff" />
      </Row>
      {!!err && <T size={12.5} color={C.red}>{err}</T>}
    </Screen>
  );
}
