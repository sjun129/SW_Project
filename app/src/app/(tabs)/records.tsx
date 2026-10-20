import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { STAGE_LABEL, useStore, type Stage } from '@/store';
import { C } from '@/theme';
import { Btn, Chip, Header, Icon, Row, s, Screen, T } from '@/ui';

const STAGES: Stage[] = ['in', 'live', 'out'];
type Filter = 'all' | 'defect' | 'empty';

export default function Records() {
  const { zones, photosOf, addZone } = useStore();
  const [stage, setStage] = useState<Stage>('in');
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const rows = zones.map((z) => {
    const ps = photosOf(stage, z.id);
    return { z, ps, defects: ps.reduce((n, p) => n + p.defects.length, 0) };
  });
  const shown = rows.filter((r) => filter === 'all' || (filter === 'defect' ? r.defects > 0 : r.ps.length === 0));
  const add = () => { if (!name.trim()) return; addZone(name.trim()); setName(''); setAdding(false); };

  return (
    <Screen gap={12} header={<Header title="기록" back={false} right={
      <Pressable onPress={() => setAdding(true)} style={rs.addBtn}><Icon name="plus" size={14} color={C.accent} /><T size={12.5} w="b" color={C.accent}>구역 추가</T></Pressable>
    } />}>
      <View style={rs.seg}>
        {STAGES.map((k) => (
          <Pressable key={k} onPress={() => setStage(k)} style={[rs.segItem, stage === k && rs.segOn]}>
            <T size={13.5} w={stage === k ? 'b' : 'm'} color={stage === k ? C.ink : C.muted}>{STAGE_LABEL[k]}</T>
          </Pressable>
        ))}
      </View>
      <Row gap={6}>
        <Chip label={`전체 ${rows.length}`} on={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={`하자 있음 ${rows.filter((r) => r.defects).length}`} on={filter === 'defect'} onPress={() => setFilter('defect')} />
        <Chip label={`미촬영 ${rows.filter((r) => !r.ps.length).length}`} on={filter === 'empty'} onPress={() => setFilter('empty')} />
      </Row>
      {adding && (
        <View style={{ gap: 8 }}>
          <TextInput nativeID="new-zone" autoFocus value={name} onChangeText={setName} placeholder="구역 이름 (예: 베란다)" placeholderTextColor={C.muted} style={s.field} onSubmitEditing={add} />
          <Row><Btn label="취소" kind="ghost" onPress={() => setAdding(false)} /><Btn label="추가" onPress={add} /></Row>
        </View>
      )}
      <View style={rs.grid}>
        {shown.map(({ z, ps, defects }) => (
          <Pressable key={z.id} style={rs.zone} onPress={() => router.push({ pathname: '/zone/[id]', params: { id: z.id, stage } })}>
            {ps.length ? <Image source={ps[ps.length - 1].src} style={rs.thumb} /> : (
              <View style={[rs.thumb, rs.empty]}><Icon name="camera" size={22} color={C.muted} /><T size={11.5} w="m" color={C.muted}>눌러서 촬영</T></View>
            )}
            <View style={{ padding: 12, gap: 2 }}>
              <T size={14} w="b">{z.name}</T>
              <T size={12} color={defects ? C.red : C.muted}>{ps.length ? `사진 ${ps.length}장 · 하자 ${defects}건` : '아직 사진 없음'}</T>
            </View>
          </Pressable>
        ))}
        <Pressable style={[rs.zone, rs.addTile]} onPress={() => setAdding(true)}>
          <Icon name="plus" size={22} color={C.muted} /><T size={13} w="m" color={C.muted}>구역 추가</T>
        </Pressable>
      </View>
    </Screen>
  );
}

const rs = StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.soft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  seg: { flexDirection: 'row', backgroundColor: C.sunk, borderRadius: 12, padding: 4, gap: 4 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9 },
  segOn: { backgroundColor: C.surface, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  zone: { width: '48.5%', flexGrow: 1, backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden' },
  thumb: { width: '100%', height: 110, backgroundColor: C.photo },
  empty: { backgroundColor: C.sunk, alignItems: 'center', justifyContent: 'center', gap: 4 },
  addTile: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line },
});
