import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as db from '@/lib/db';
import { supabaseConfigured } from '@/lib/supabase';
import { errText, useStore } from '@/store';
import { C } from '@/theme';
import { Btn, Card, Footer, Icon, Legal, LOGO_COMPACT, Mascot, Pill, Row, s, Screen, T, TaggedPhoto } from '@/ui';

/**
 * FR-09/10 landlord page. Opened from the shared link (web build: /c/<token>), no app install or login.
 * Everything is read and written through the token RPCs; the server stamps view/answer times.
 */
export default function LandlordLink() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { refresh, mode } = useStore();
  const [data, setData] = useState<db.LandlordData | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [signer, setSigner] = useState('');
  const [objectFor, setObjectFor] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const linkError = (e: unknown) => (/expired|invalid/i.test(errText(e)) ? '링크가 만료되었거나 올바르지 않아요. 세입자에게 다시 보내 달라고 요청해 주세요.' : errText(e));
  useEffect(() => {
    if (supabaseConfigured) db.landlordView(token).then(setData, (e) => setErr(linkError(e)));
  }, [token]);

  const respond = async (ok: boolean) => {
    if (!signer.trim()) return setErr('확인자 이름을 입력해 주세요.');
    if (!ok && !comment.trim()) return setErr('이의를 남길 항목에 내용을 적어 주세요.');
    setBusy(true); setErr('');
    try {
      const zone = data?.photos.find((p) => p.id === objectFor)?.zone;
      await db.landlordRespond(token, ok, signer.trim(), ok ? undefined : `${zone ? `${zone}: ` : ''}${comment.trim()}`);
      setData(await db.landlordView(token));
      if (mode === 'remote') refresh().catch(() => {});
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const bar = (
    <SafeAreaView edges={['top']} style={{ backgroundColor: C.surface }}>
      <Row gap={10} style={{ height: 60, paddingHorizontal: 16 }}>
        <Row gap={6} style={{ flex: 1, backgroundColor: C.field, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Icon name="lock" size={14} color={C.muted} /><T size={12} w="mono" color={C.muted} lines={1}>jachwisillok.kr/c/{token}</T>
        </Row>
        <Pressable accessibilityLabel="닫기" onPress={close}><Icon name="x" size={20} color={C.muted} /></Pressable>
      </Row>
    </SafeAreaView>
  );

  if (!data) return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>{bar}
      <View style={{ alignItems: 'center', gap: 12, padding: 32 }}>
        {err || !supabaseConfigured ? <><Mascot name="think" size={88} /><T size={15} w="b" style={{ textAlign: 'center' }}>{err || '서버 설정이 없어 링크를 열 수 없어요.'}</T></> : <ActivityIndicator color={C.accent} />}
      </View>
    </View>
  );

  if (data.status === 'signed' || data.status === 'objected') return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>{bar}
      <View style={{ alignItems: 'center', gap: 12, padding: 32 }}>
        <Mascot name={data.status === 'signed' ? 'checked' : 'think'} size={96} />
        <T size={20} w="b">{data.status === 'signed' ? '확인해 주셔서 감사해요' : '이의를 전달했어요'}</T>
        <T size={13} color={C.muted} style={{ textAlign: 'center' }}>{data.signer ? `${data.signer} 님의 응답이 기록됐어요. ` : ''}세입자에게 바로 알림이 가요. 이 화면은 닫으셔도 돼요.</T>
      </View>
    </View>
  );

  const unit = data.address.split(' ').at(-1);
  const defects = data.photos.reduce((n, p) => n + p.defects.length, 0);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {bar}
      <Screen gap={12} footer={data.preview ? undefined : <Footer>
        <Btn kind="ghost" label="이의 남기기" disabled={busy || !objectFor} onPress={() => respond(false)} />
        <Btn label={busy ? '저장 중…' : '확인했어요'} disabled={busy} onPress={() => respond(true)} />
      </Footer>}>
        {data.preview && (
          <Row gap={8} style={{ backgroundColor: C.soft, borderRadius: 12, padding: 12 }}>
            <Icon name="eye" size={16} color={C.accent} />
            <T size={12.5} color={C.accent} style={{ flex: 1 }}>임대인이 보게 될 화면의 미리보기예요. 미리보기는 열람으로 기록되지 않고, 확인·이의는 임대인만 남길 수 있어요.</T>
          </Row>
        )}
        <Card style={{ gap: 8 }}>
          <Image source={LOGO_COMPACT} style={{ width: 68, height: 22 }} resizeMode="contain" />
          <T size={18} w="b">{unit} 세입자가 입주 상태 기록을 보냈어요</T>
          <T size={13} color={C.muted}>서로 편하자고 남기는 기록이에요. 사진은 촬영 즉시 고정되어 수정할 수 없어요.</T>
          <Row gap={6}><Pill label={`사진 ${data.photos.length}장`} /><Pill label={`하자 ${defects}건`} tone="red" /><Pill label="앱 설치 불필요" tone="ok" /></Row>
        </Card>
        {data.photos.map((p) => (
          <Card key={p.id} style={{ gap: 8, padding: 14 }}>
            {p.url ? <TaggedPhoto src={{ uri: p.url }} defects={p.defects.map((d, i) => ({ id: String(i), label: d.label, ...d.bbox, source: 'ai' as const }))} height={190} radius={12} />
              : <View style={{ height: 120, borderRadius: 12, backgroundColor: C.photo, alignItems: 'center', justifyContent: 'center' }}><T size={12} color="#fff">사진 링크가 만료됐어요</T></View>}
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T size={15} w="b">{p.zone}</T>
                <T size={12.5} color={p.defects.length ? C.red : C.muted}>{p.defects.length ? p.defects.map((d) => d.label).join(', ') : '하자 표시 없음'}</T>
              </View>
              <Pressable onPress={() => setObjectFor(objectFor === p.id ? null : p.id)}><T size={13} w="m" color={C.accent}>{objectFor === p.id ? '취소' : '이의 남기기'}</T></Pressable>
            </Row>
            {objectFor === p.id && <TextInput nativeID={`objection-${p.id}`} autoFocus value={comment} onChangeText={setComment} placeholder="어떤 점이 다른가요?" placeholderTextColor={C.muted} style={s.field} />}
          </Card>
        ))}
        <View style={{ gap: 6 }}>
          <T size={12.5} w="m" color={C.muted}>확인자 이름</T>
          <TextInput nativeID="signer" value={signer} onChangeText={setSigner} placeholder="성함을 적어 주세요" placeholderTextColor={C.muted} style={s.field} />
        </View>
        {!!err && <T size={12.5} color={C.red}>{err}</T>}
        <T size={11.5} color={C.muted}>링크 만료: {new Date(data.expires_at).toLocaleDateString('ko-KR')}</T>
        <Legal />
      </Screen>
    </View>
  );
}
