import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useStore } from '@/store';
import { C } from '@/theme';
import { Btn, Footer, Header, Icon, Row, s, Screen, T } from '@/ui';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function LeaseRegister() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { addLease } = useStore();
  const [f, setF] = useState({ address: '', start: '2026-03-01', end: '2027-02-28', deposit: '', landlord: '' });
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const save = () => {
    if (!f.address.trim()) return setErr('주소를 입력해 주세요.');
    if (!DATE.test(f.start) || !DATE.test(f.end)) return setErr('계약 기간은 2026-03-01 형식으로 입력해 주세요.');
    if (f.end <= f.start) return setErr('계약 만료일은 시작일보다 뒤여야 해요.');
    addLease({ ...f, deposit: f.deposit.replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0' });
    router.replace('/home');
  };
  const field = (label: string, k: keyof typeof f, ph: string, extra?: object) => (
    <View style={{ gap: 6, flex: 1 }}>
      <T size={12.5} w="m" color={C.muted}>{label}</T>
      <TextInput nativeID={`lease-${k}`} value={f[k]} onChangeText={set(k)} placeholder={ph} placeholderTextColor={C.muted} style={s.field} {...extra} />
    </View>
  );
  return (
    <Screen gap={16} header={<Header title={from === 'signup' ? '가입 · 집 등록' : '집 등록'} />} footer={<Footer><Btn label="등록하고 시작하기" onPress={save} /></Footer>}>
      <View style={{ gap: 4 }}><T size={22} w="b">어느 집에 들어가나요?</T><T size={13} color={C.muted}>나중에 내 집 탭에서 언제든 고칠 수 있어요.</T></View>
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
