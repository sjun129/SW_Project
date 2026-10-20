import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { short } from '@/hash';
import { buildReport } from '@/lib/docs';
import { exportPdf } from '@/lib/pdf';
import { errText, useStore } from '@/store';
import { C } from '@/theme';
import { Btn, Card, Footer, Header, Icon, Mascot, Row, Screen, T } from '@/ui';

const INFO = {
  compare: { t: '퇴거 비교 리포트', d: '입주·퇴거 사진 비교 · 변화 하이라이트 · 참고 분류 · 해시 체인' },
  only: { t: '퇴거 단독 리포트', d: '입주 기록 없이 통상 손모 체크리스트로 점검 · 해시 체인' },
};
const METHODS = ['토스페이', '신용·체크카드', '카카오페이'];

export default function Payment() {
  const { key: rawKey } = useLocalSearchParams<{ key?: string }>();
  const key: keyof typeof INFO = rawKey === 'only' ? 'only' : 'compare';
  const st = useStore();
  const { pay, paid, chains } = st;
  const [method, setMethod] = useState(METHODS[0]);
  const [agree, setAgree] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const info = INFO[key];

  if (paid[key]) return (
    <Screen header={<Header title="리포트 발급" />} footer={<Footer><Btn kind="ghost" label={busy ? '만드는 중…' : 'PDF 공유'} disabled={busy} onPress={async () => { setBusy(true); setErr(''); try { await exportPdf(await buildReport(st, key)); } catch (e) { setErr(errText(e)); } finally { setBusy(false); } }} /><Btn label="리포트 목록으로" onPress={() => router.replace('/reports')} /></Footer>}>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 28 }}>
        <Mascot name="proof" size={110} />
        <T size={20} w="b">{info.t}가 발급됐어요</T>
        <T size={13} color={C.muted}>확실한 증거로 보증금을 지켜요</T>
      </View>
      <Card>
        {[['결제', `9,900원 · ${method} (모의)`], ['입주 chain', short(chains.in)], ['퇴거 chain', short(chains.out)]].map(([k, v]) => (
          <Row key={k} gap={12}><T size={12.5} color={C.muted} style={{ width: 76 }}>{k}</T><T size={12.5} w={k === '결제' ? 'r' : 'mono'} style={{ flex: 1 }}>{v}</T></Row>
        ))}
      </Card>
      {!!err && <T size={12.5} color={C.red}>{err}</T>}
    </Screen>
  );

  // ponytail: mock PG delay; replace with the Toss Payments SDK + server-side confirmation
  const submit = async () => {
    setBusy(true); setErr('');
    try { await new Promise((r) => setTimeout(r, 900)); await pay(key); } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Screen gap={12} header={<Header title="결제" />}
      footer={<Footer><Btn label={busy ? '결제 중…' : '9,900원 결제하기'} disabled={!agree || busy} onPress={submit} /></Footer>}>
      <Card><T size={16} w="b">{info.t}</T><T size={12.5} color={C.muted}>{info.d}</T></Card>
      <Card style={{ gap: 10 }}>
        {[['리포트', '9,900원'], ['할인', '0원']].map(([k, v]) => <Row key={k} style={{ justifyContent: 'space-between' }}><T size={13.5} color={C.muted}>{k}</T><T size={13.5}>{v}</T></Row>)}
        <Row style={{ justifyContent: 'space-between' }}><T size={15} w="b">결제 금액</T><T size={18} w="k">9,900원</T></Row>
      </Card>
      <T size={14} w="b">결제 수단</T>
      {METHODS.map((m) => {
        const on = m === method;
        return (
          <Pressable key={m} onPress={() => setMethod(m)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, backgroundColor: on ? C.soft : C.surface, borderWidth: on ? 1.5 : 0, borderColor: C.accent }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: on ? 6 : 1.5, borderColor: on ? C.accent : C.line }} />
            <T size={14.5} w={on ? 'b' : 'r'}>{m}</T>
          </Pressable>
        );
      })}
      <Pressable onPress={() => setAgree(!agree)}>
        <Row gap={8}>
          <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: agree ? C.accent : C.surface, borderWidth: agree ? 0 : 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>{agree && <Icon name="check" size={14} color="#fff" />}</View>
          <T size={12.5} color={C.muted}>결제 내용을 확인했고 이에 동의합니다</T>
        </Row>
      </Pressable>
      {busy && <ActivityIndicator color={C.accent} />}
      {!!err && <T size={12.5} color={C.red}>{err}</T>}
    </Screen>
  );
}
