import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { errText, useStore, type Stage } from '@/store';
import { C } from '@/theme';
import { Btn, Chip, IconBox, Row, s, Sheet, T, type IconName } from '@/ui';

const TYPES: { k: Stage; t: string; d: string; icon: IconName }[] = [
  { k: 'in', t: '입주 기록', d: '이사 들어온 날의 상태', icon: 'home' },
  { k: 'live', t: '거주 중 하자', d: '살다가 생긴 고장·파손', icon: 'alert-triangle' },
  { k: 'out', t: '퇴거 기록', d: '나가기 전 상태', icon: 'repeat' },
];

export default function Capture() {
  const { zones, photosOf, addZone } = useStore();
  const [stage, setStage] = useState<Stage>('in');
  const firstEmpty = zones.find((z) => !photosOf('in', z.id).length)?.id ?? zones[0]?.id ?? '';
  const [zone, setZone] = useState(firstEmpty);
  const [custom, setCustom] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const open = async () => {
    try {
      const id = custom?.trim() ? (await addZone(custom.trim())).id : zone;
      router.replace({ pathname: '/camera', params: { stage, zone: id } });
    } catch (e) { setErr(errText(e)); }
  };
  return (
    <Sheet>
      <T size={19} w="b">무엇을 기록할까요?</T>
      <T size={13} color={C.muted} style={{ marginTop: -8 }}>순서 상관없이, 지금 필요한 것부터 찍으면 돼요.</T>
      <View style={{ gap: 8 }}>
        {TYPES.map((x) => {
          const on = x.k === stage;
          return (
            <Pressable key={x.k} onPress={() => setStage(x.k)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: on ? 1.5 : 1, borderColor: on ? C.accent : C.line, backgroundColor: on ? C.soft : C.surface }}>
              <IconBox name={x.icon} bg={on ? C.surface : C.soft} />
              <View><T size={15} w="b">{x.t}</T><T size={12.5} color={C.muted}>{x.d}</T></View>
            </Pressable>
          );
        })}
      </View>
      <T size={13} w="b" color={C.muted}>구역</T>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {zones.map((z) => <Chip key={z.id} label={z.name} on={custom === null && zone === z.id} onPress={() => { setZone(z.id); setCustom(null); }} />)}
        <Chip label="+ 직접 입력" on={custom !== null} onPress={() => setCustom('')} />
      </Row>
      {custom !== null && <TextInput nativeID="custom-zone" autoFocus value={custom} onChangeText={setCustom} placeholder="구역 이름" placeholderTextColor={C.muted} style={s.field} />}
      {!!err && <T size={12.5} color={C.red}>{err}</T>}
      <Btn label="카메라 열기" icon="camera" onPress={open} disabled={!zones.length && !custom?.trim()} />
    </Sheet>
  );
}
