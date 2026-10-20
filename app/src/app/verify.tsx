import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { short } from '@/hash';
import type { VerifyResult } from '@/lib/db';
import { errText, fmtTime, STAGE_LABEL, useStore } from '@/store';
import { C, FONT } from '@/theme';
import { Btn, Card, Header, Icon, Row, Screen, T } from '@/ui';

const STAGE_KO = { move_in: STAGE_LABEL.in, living: STAGE_LABEL.live, move_out: STAGE_LABEL.out } as const;

/** FR-18: check whether a SHA-256 belongs to a registered original, and when the server received it. */
export default function Verify() {
  const { verify, photos, zones } = useStore();
  const [hash, setHash] = useState('');
  const [res, setRes] = useState<VerifyResult | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = /^[0-9a-f]{64}$/i.test(hash.trim());

  const run = async (h = hash) => {
    setBusy(true); setErr(''); setRes(null);
    try { setRes(await verify(h)); } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };

  return (
    <Screen header={<Header title="원본 검증" />}>
      <T size={13} color={C.muted}>사진 파일의 SHA-256 값을 넣으면, 자취실록 서버에 같은 원본이 언제 등록됐는지 확인해요. 사진이 한 픽셀이라도 바뀌면 값이 달라져요.</T>
      <TextInput nativeID="verify-hash" value={hash} onChangeText={setHash} autoCapitalize="none" autoCorrect={false} multiline placeholder="64자리 SHA-256 값"
        placeholderTextColor={C.muted} style={{ backgroundColor: C.field, borderRadius: 12, padding: 14, minHeight: 72, fontFamily: FONT.mono, fontSize: 13, color: C.ink, includeFontPadding: false, textAlignVertical: 'top' }} />
      {!!hash && !valid && <T size={12} color={C.red}>SHA-256은 0-9, a-f로 이루어진 64자리예요.</T>}
      <Btn label="검증하기" icon="shield" disabled={!valid || busy} onPress={() => run()} />
      {busy && <ActivityIndicator color={C.accent} />}
      {!!err && <T size={12.5} color={C.red}>{err}</T>}
      {res && (res.found ? (
        <Card style={{ backgroundColor: C.okSoft, gap: 6 }}>
          <Row gap={8}><Icon name="check-circle" size={18} color={C.ok} /><T size={15} w="b" color={C.ok}>등록된 원본이에요</T></Row>
          <T size={13}>서버 확인 {new Date(res.server_ts).toLocaleString('ko-KR')} · {res.zone} · {STAGE_KO[res.stage]}</T>
          <T size={12.5} color={C.muted}>{res.confirmed ? '임대인 확인까지 완료된 기록이에요.' : '임대인 확인은 아직 없는 기록이에요.'}</T>
        </Card>
      ) : (
        <Card style={{ backgroundColor: C.redSoft, gap: 6 }}>
          <Row gap={8}><Icon name="x-circle" size={18} color={C.red} /><T size={15} w="b" color={C.red}>등록된 원본이 아니에요</T></Row>
          <T size={12.5} color={C.muted}>사진이 편집·압축됐거나 자취실록으로 찍지 않은 사진일 수 있어요.</T>
        </Card>
      ))}
      {photos.length > 0 && (
        <View style={{ gap: 8 }}>
          <T size={13} w="b" color={C.muted}>내 사진에서 고르기</T>
          {photos.slice(-5).reverse().map((p) => (
            <Pressable key={p.id} onPress={() => { setHash(p.hash); run(p.hash); }}>
              <Row gap={10} style={{ backgroundColor: C.surface, borderRadius: 12, padding: 12 }}>
                <View style={{ flex: 1 }}>
                  <T size={13.5} w="m">{zones.find((z) => z.id === p.zoneId)?.name} · {STAGE_LABEL[p.stage]}</T>
                  <T size={11.5} w="mono" color={C.muted}>{short(p.hash)} · {fmtTime(p.serverTs)}</T>
                </View>
                <Icon name="chevron-right" size={16} color={C.muted} />
              </Row>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
