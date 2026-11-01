import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { extractLease } from '@/lib/db';
import { prefs, scheduleMoveOutReminder } from '@/lib/reminder';
import { errText, useStore } from '@/store';
import { C } from '@/theme';
import { Btn, Footer, Header, Icon, Row, s, Screen, T } from '@/ui';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (value: string) => {
  if (!DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export default function LeaseRegister() {
  const { from, edit } = useLocalSearchParams<{ from?: string; edit?: string }>();
  const { addLease, updateLease, lease, mode } = useStore();
  const editing = edit === '1' && !!lease.id;
  const [f, setF] = useState(editing
    ? { address: lease.address, start: lease.start, end: lease.end, deposit: lease.deposit, landlord: lease.landlord }
    : { address: '', start: '2026-03-01', end: '2027-02-28', deposit: '', landlord: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [ocr, setOcr] = useState('');
  // Contract photo -> form values via the vision function. Only fills fields the model could read; the user still reviews and saves.
  const fromPhoto = async (camera: boolean) => {
    if (mode !== 'remote') return setOcr('계약서 읽기는 로그인한 뒤에 쓸 수 있어요.');
    try {
      const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return setOcr('사진 권한이 필요해요. 기기 설정에서 권한을 허용한 뒤 다시 시도해 주세요.');
      const opts = { mediaTypes: ['images'] as ImagePicker.MediaType[], base64: true, quality: 0.6 };
      const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      const a = r.canceled ? undefined : r.assets[0];
      if (!a?.base64) return;
      setOcr('계약서를 읽는 중…'); setErr('');
      const g = await extractLease(`data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}`);
      setF((x) => ({
        address: g.address || x.address,
        start: validDate(g.start_date) ? g.start_date : x.start,
        end: validDate(g.end_date) ? g.end_date : x.end,
        deposit: g.deposit > 0 ? g.deposit.toLocaleString('ko-KR') : x.deposit,
        landlord: g.landlord_phone || x.landlord,
      }));
      setOcr('읽은 값을 채웠어요. 틀린 곳이 없는지 확인한 뒤 저장해 주세요.');
    } catch (e) { setOcr(`사진을 불러오거나 계약서를 읽지 못했어요: ${errText(e)}`); }
  };
  const save = async () => {
    if (!f.address.trim()) return setErr('주소를 입력해 주세요.');
    if (!validDate(f.start) || !validDate(f.end)) return setErr('실제로 존재하는 날짜를 YYYY-MM-DD 형식으로 입력해 주세요.');
    if (f.end <= f.start) return setErr('계약 만료일은 시작일보다 뒤여야 해요.');
    setBusy(true); setErr('');
    try {
      const data = { ...f, deposit: f.deposit.replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0' };
      if (editing) await updateLease(data); else await addLease(data);
      if ((await prefs.get()).reminder) scheduleMoveOutReminder(f.end).catch(() => {});
      if (editing) router.back(); else router.replace('/home');
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const field = (label: string, k: keyof typeof f, ph: string, extra?: object) => (
    <View style={{ gap: 6, flex: 1 }}>
      <T size={12.5} w="m" color={C.muted}>{label}</T>
      <TextInput nativeID={`lease-${k}`} value={f[k]} onChangeText={set(k)} placeholder={ph} placeholderTextColor={C.muted} style={s.field} {...extra} />
    </View>
  );
  return (
    <Screen gap={16} header={<Header title={editing ? '집 정보 수정' : from === 'signup' ? '가입 · 집 등록' : '집 등록'} />} footer={<Footer><Btn label={busy ? '저장 중…' : editing ? '저장' : '등록하고 시작하기'} disabled={busy} onPress={save} /></Footer>}>
      <View style={{ gap: 4 }}><T size={22} w="b">{editing ? '집 정보를 고쳐요' : '어느 집에 들어가나요?'}</T><T size={13} color={C.muted}>나중에 내 집 탭에서 언제든 고칠 수 있어요.</T></View>
      <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 14, gap: 10 }}>
        <Row gap={8}><Icon name="file-text" size={18} color={C.accent} /><T size={14} w="b" style={{ flex: 1 }}>계약서 사진으로 채우기</T></Row>
        <Row gap={8}>
          <Btn kind="soft" label="촬영" onPress={() => fromPhoto(true)} />
          <Btn kind="soft" label="앨범에서" onPress={() => fromPhoto(false)} />
        </Row>
        {!!ocr && <T size={12.5} color={C.muted}>{ocr}</T>}
      </View>
      <View style={{ gap: 6 }}>
        <T size={12.5} w="m" color={C.muted}>주소</T>
        <Row style={{ backgroundColor: C.field, borderRadius: 12, paddingRight: 14 }}>
          <TextInput nativeID="lease-address" value={f.address} onChangeText={set('address')} placeholder="부산 금정구 장전동 ○○빌 302호" placeholderTextColor={C.muted} style={[s.field, { flex: 1 }]} />
          <Icon name="search" size={18} color={C.muted} />
        </Row>
      </View>
      <Row gap={10}>{field('계약 시작', 'start', '2026-03-01')}{field('계약 만료', 'end', '2027-02-28')}</Row>
      {field('보증금 (원)', 'deposit', '5,000,000', { keyboardType: 'number-pad' })}
      {field('임대인 연락처 (선택)', 'landlord', '010-1234-5678', { keyboardType: 'phone-pad' })}
      <T size={12} color={C.muted}>임대인 연락처는 확인 링크를 보낼 때만 쓰고 마케팅에 쓰지 않아요.</T>
      {!!err && <T size={12.5} color={C.red}>{err}</T>}
    </Screen>
  );
}
