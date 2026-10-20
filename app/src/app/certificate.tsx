import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { short } from '@/hash';
import { buildCertificate } from '@/lib/docs';
import { exportPdf } from '@/lib/pdf';
import { CONFIRM_LABEL, errText, fmtTime, useStore } from '@/store';
import { C } from '@/theme';
import { Btn, Footer, Header, Legal, LOGO_COMPACT, Pill, Row, Screen, T } from '@/ui';

export default function Certificate() {
  const st = useStore();
  const { photosOf, zones, chains, lease, confirm } = st;
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfErr, setPdfErr] = useState('');
  const savePdf = async () => {
    setPdfBusy(true); setPdfErr('');
    try { await exportPdf(await buildCertificate(st)); } catch (e) { setPdfErr(errText(e)); } finally { setPdfBusy(false); }
  };
  const [all, setAll] = useState(false);
  const ps = photosOf('in');
  const defects = ps.reduce((n, p) => n + p.defects.length, 0);
  const rows = zones.map((z) => ({ z, p: ps.find((x) => x.zoneId === z.id) })).filter((r) => r.p);
  const kv: [string, string, boolean?][] = [['주소', lease.address], ['기록일', ps[0] ? fmtTime(ps[0].serverTs) : '—'], ['사진 · 하자', `${ps.length}장 · ${defects}건`], ['chain_hash', short(chains.in), true]];
  return (
    <Screen header={<Header title="입주 상태 확인서" />}
      footer={<Footer><Btn kind="ghost" label={pdfBusy ? '만드는 중…' : 'PDF 저장'} disabled={pdfBusy} onPress={savePdf} /><Btn label={confirm.status === 'none' ? '임대인에게 보내기' : '다시 보내기'} onPress={() => router.push('/share')} /></Footer>}>
      {confirm.status !== 'none' && <Pill label={`임대인 ${CONFIRM_LABEL[confirm.status]}${confirm.channel ? ` · ${confirm.channel}` : ''}`} tone={confirm.status === 'signed' ? 'ok' : 'accent'} />}
      <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 18, gap: 12, shadowColor: '#1F2633', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
        <Row style={{ justifyContent: 'space-between' }}><Image source={LOGO_COMPACT} style={{ width: 68, height: 22 }} resizeMode="contain" /><T size={10.5} w="mono" color={C.muted}>No. JS-2026-1014-302</T></Row>
        <T size={18} w="b">입주 상태 확인서</T>
        <View style={{ gap: 6 }}>
          {kv.map(([k, v, mono]) => <Row key={k} gap={12} center={false}><T size={12.5} color={C.muted} style={{ width: 76 }}>{k}</T><T size={mono ? 11 : 13} w={mono ? 'mono' : 'r'} color={mono ? C.muted : C.ink} style={{ flex: 1 }}>{v}</T></Row>)}
        </View>
        <View style={{ height: 1, backgroundColor: C.line }} />
        {(all ? rows : rows.slice(0, 4)).map(({ z, p }) => (
          <Row key={z.id} gap={10}>
            <Image source={p!.src} style={{ width: 52, height: 40, borderRadius: 6 }} />
            <View style={{ flex: 1 }}>
              <T size={13} w="b">{z.name}</T>
              <T size={12} color={p!.defects.length ? C.red : C.muted}>{p!.defects.length ? p!.defects.map((d) => d.label).join(', ') : '이상 없음'}</T>
            </View>
          </Row>
        ))}
        {rows.length > 4 && <Pressable onPress={() => setAll(!all)}><T size={12.5} w="m" color={C.accent}>{all ? '접기' : `+ ${rows.length - 4}개 구역 더 보기`}</T></Pressable>}
        {rows.length < zones.length && <T size={12} color={C.muted}>아직 찍지 않은 구역 {zones.length - rows.length}곳은 확인서에 빠져요. 지금 보내도 되고, 다 찍은 뒤 다시 보내도 돼요.</T>}
      </View>
      {!!pdfErr && <T size={12.5} color={C.red}>{pdfErr}</T>}
      <Legal />
    </Screen>
  );
}
