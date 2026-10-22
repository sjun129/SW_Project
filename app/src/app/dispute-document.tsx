import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { exportPdf, type PdfDoc } from '@/lib/pdf';
import { errText, useStore } from '@/store';
import { C } from '@/theme';
import { Btn, Card, Chip, Footer, Header, Screen, T } from '@/ui';

type DraftKind = 'notice' | 'mediation';

export default function DisputeDocument() {
  const st = useStore();
  const [kind, setKind] = useState<DraftKind>('notice');
  const [tenant, setTenant] = useState('');
  const [facts, setFacts] = useState(() => st.defectReports.length
    ? st.defectReports.map((r) => `• ${r.place} · ${r.category}${r.memo ? `: ${r.memo}` : ''} (기록 ${new Date(r.time).toLocaleDateString('ko-KR')})`).join('\n')
    : '');
  const [request, setRequest] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const title = kind === 'notice' ? '내용증명 초안' : '주택임대차 분쟁조정 신청서 초안';

  const save = async () => {
    if (!tenant.trim() || !facts.trim() || !request.trim()) {
      setError('임차인 이름, 사실관계, 요청사항을 모두 작성해 주세요.');
      return;
    }
    setBusy(true); setError('');
    try {
      const tenantName = tenant.trim();
      const doc: PdfDoc = {
        title, docNo: `JS-DRAFT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        meta: [['주소', st.lease.address], ['임대인', st.lease.landlord || '직접 입력 필요'], ['임차인', tenantName], ['작성일', new Date().toLocaleDateString('ko-KR')]],
        photos: [], showPhotos: false,
        body: kind === 'notice'
          ? `제목: 임대차 관련 사실 통지 및 요청\n\n수신인: ${st.lease.landlord || '[임대인 성명]'}\n발신인: ${tenantName}\n\n1. 사실관계\n${facts.trim()}\n\n2. 요청사항\n${request.trim()}\n\n위 내용에 대한 회신을 요청합니다.\n\n발신인: ${tenantName} (서명 또는 날인)`
          : `신청 취지\n${request.trim()}\n\n분쟁 내용 및 경위\n${facts.trim()}\n\n당사자 정보\n임차인: ${tenantName}\n임대인: ${st.lease.landlord || '직접 입력 필요'}\n임대차 주소: ${st.lease.address}\n계약 기간: ${st.lease.start} ~ ${st.lease.end}\n보증금: ${st.lease.deposit}원`,
        footer: '작성자가 편집한 초안입니다. 사실관계와 첨부자료를 확인한 뒤 사용하세요. 법률 자문이나 기관 제출용 공식 서식이 아닙니다.',
      };
      await exportPdf(doc);
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  const inputStyle = { borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, color: C.ink, fontSize: 14, lineHeight: 21, backgroundColor: C.surface } as const;
  return (
    <Screen gap={12} header={<Header title="분쟁 대응 문서 초안" />} footer={<Footer><Btn label={busy ? 'PDF 준비 중…' : 'PDF로 저장·공유'} disabled={busy} onPress={save} /></Footer>}>
      <T size={12.5} color={C.muted}>기록과 집 정보를 참고해 초안을 만들어요. 내용을 검토하고 필요한 부분을 직접 수정하세요.</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="내용증명" on={kind === 'notice'} onPress={() => setKind('notice')} />
        <Chip label="분쟁조정 신청서" on={kind === 'mediation'} onPress={() => setKind('mediation')} />
      </View>
      <Card style={{ gap: 8 }}>
        <T size={13} w="b">임차인 이름</T>
        <TextInput accessibilityLabel="임차인 이름" placeholder="임차인 성명을 입력하세요" value={tenant} onChangeText={(v) => { setTenant(v); setError(''); }} style={inputStyle} />
        <T size={13} w="b">사실관계</T>
        <TextInput accessibilityLabel="사실관계" multiline placeholder="분쟁이 발생한 경위와 날짜, 상대방과 나눈 내용을 구체적으로 작성하세요." value={facts} onChangeText={(v) => { setFacts(v); setError(''); }} textAlignVertical="top" style={[inputStyle, { minHeight: 150 }]} />
        <T size={13} w="b">요청사항</T>
        <TextInput accessibilityLabel="요청사항" multiline placeholder="원하는 조치와 답변 기한을 구체적으로 작성하세요." value={request} onChangeText={(v) => { setRequest(v); setError(''); }} textAlignVertical="top" style={[inputStyle, { minHeight: 90 }]} />
      </Card>
      <T size={11.5} color={C.muted}>초안은 기기에 자동 저장되지 않아요. 공식 서식·제출 요건은 해당 기관에서 확인하세요.</T>
      {!!error && <T size={12.5} color={C.red}>{error}</T>}
    </Screen>
  );
}
