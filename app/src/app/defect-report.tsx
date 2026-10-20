import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, Switch, TextInput, View } from 'react-native';
import { useStore } from '@/store';
import { C, FONT } from '@/theme';
import { Btn, Chip, Footer, Header, Icon, Row, Screen, T } from '@/ui';

const CATS = ['누수', '곰팡이', '고장', '파손', '기타'];
const PLACES = ['욕실', '주방', '현관', '방'];

export default function DefectReport() {
  const { addDefectReport, photosOf } = useStore();
  const [cat, setCat] = useState('고장');
  const [place, setPlace] = useState('욕실');
  const [memo, setMemo] = useState('');
  const [repair, setRepair] = useState(true);
  const livePhotos = photosOf('live');
  const save = () => { addDefectReport({ category: cat, place, memo, repair }); router.back(); };
  return (
    <Screen header={<Header title="하자 신고" />} footer={<Footer><Btn label="신고 저장" onPress={save} /></Footer>}>
      <Row gap={8}>
        {livePhotos.slice(-2).map((p) => <Image key={p.id} source={p.src} style={{ width: 100, height: 100, borderRadius: 14 }} />)}
        <Pressable onPress={() => router.push({ pathname: '/camera', params: { stage: 'live' } })} style={{ width: 100, height: 100, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Icon name="camera" size={22} color={C.muted} /><T size={11} w="m" color={C.muted}>{livePhotos.length}/5</T>
        </Pressable>
      </Row>
      <T size={14} w="b">어떤 문제인가요?</T>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>{CATS.map((c) => <Chip key={c} label={c} on={c === cat} onPress={() => setCat(c)} />)}</Row>
      <T size={14} w="b">어디인가요?</T>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>{PLACES.map((c) => <Chip key={c} label={c} on={c === place} onPress={() => setPlace(c)} />)}</Row>
      <T size={14} w="b">메모</T>
      <TextInput nativeID="defect-memo" multiline value={memo} onChangeText={setMemo} placeholder="예: 보일러 온수가 미지근하게 나와요. 10월 20일부터." placeholderTextColor={C.muted}
        style={{ backgroundColor: C.field, borderRadius: 12, padding: 16, minHeight: 96, textAlignVertical: 'top', fontFamily: FONT.r, fontSize: 14, color: C.ink }} />
      <Row gap={12} style={{ backgroundColor: C.surface, borderRadius: 14, padding: 14 }}>
        <View style={{ flex: 1 }}><T size={14} w="b">임대인에게 수리 요청 보내기</T><T size={12} color={C.muted}>요청 기록도 증빙으로 함께 남아요</T></View>
        <Switch value={repair} onValueChange={setRepair} trackColor={{ true: C.accent, false: C.line }} thumbColor="#fff" />
      </Row>
    </Screen>
  );
}
