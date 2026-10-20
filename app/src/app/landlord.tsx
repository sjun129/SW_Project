import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CONFIRM_LABEL, errText, useStore } from '@/store';
import { C } from '@/theme';
import { Btn, Card, Footer, Icon, LOGO_COMPACT, Mascot, Pill, Row, s, Screen, T, TaggedPhoto } from '@/ui';

/** Simulates the landlord's web page (SC-09): no app install, view + sign or object per item. */
export default function Landlord() {
  const { photosOf, zones, lease, confirm, landlordView, landlordRespond } = useStore();
  const [signer, setSigner] = useState('김집주');
  const [objectFor, setObjectFor] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { landlordView().catch((e) => setErr(errText(e))); }, [landlordView]);
  const respond = (okv: boolean, who: string, text?: string) => landlordRespond(okv, who, text).catch((e) => setErr(errText(e)));
  const ps = photosOf('in');
  const defects = ps.reduce((n, p) => n + p.defects.length, 0);
  const unit = lease.address.split(' ').at(-1);
  const done = confirm.status === 'signed' || confirm.status === 'objected';

  const bar = (
    <SafeAreaView edges={['top']} style={{ backgroundColor: C.surface }}>
      <Row gap={10} style={{ height: 60, paddingHorizontal: 16 }}>
        <Row gap={6} style={{ flex: 1, backgroundColor: C.field, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Icon name="lock" size={14} color={C.muted} /><T size={12} w="mono" color={C.muted}>jachwisillok.kr/c/k3x9a2qf</T>
        </Row>
        <Pressable accessibilityLabel="시연 종료" onPress={() => router.back()}><Icon name="x" size={20} color={C.muted} /></Pressable>
      </Row>
    </SafeAreaView>
  );

  if (done) return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>{bar}
      <View style={{ alignItems: 'center', gap: 12, padding: 32 }}>
        <Mascot name={confirm.status === 'signed' ? 'checked' : 'think'} size={96} />
        <T size={20} w="b">{confirm.status === 'signed' ? '확인해 주셔서 감사해요' : '이의를 전달했어요'}</T>
        <T size={13} color={C.muted} style={{ textAlign: 'center' }}>세입자에게 바로 알림이 가요. 이 화면은 닫으셔도 돼요.</T>
        <Btn label="세입자 앱으로 돌아가기 (시연)" kind="soft" onPress={() => router.back()} style={{ flexGrow: 0, alignSelf: 'stretch' }} />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {bar}
      <Screen gap={12} footer={<Footer>
        <Btn kind="ghost" label="이의 남기기" disabled={!comment.trim()} onPress={() => respond(false, signer, `${zones.find((z) => z.id === objectFor)?.name ?? ''}: ${comment}`)} />
        <Btn label="확인했어요" onPress={() => respond(true, signer.trim() || '임대인')} />
      </Footer>}>
        <Card style={{ gap: 8 }}>
          <Image source={LOGO_COMPACT} style={{ width: 68, height: 22 }} resizeMode="contain" />
          <T size={18} w="b">{unit} 세입자가 입주 상태 기록을 보냈어요</T>
          <T size={13} color={C.muted}>서로 편하자고 남기는 기록이에요. 사진은 촬영 즉시 고정되어 수정할 수 없어요.</T>
          <Row gap={6}><Pill label={`사진 ${ps.length}장`} /><Pill label={`하자 ${defects}건`} tone="red" /><Pill label={CONFIRM_LABEL[confirm.status]} tone="soft" /></Row>
        </Card>
        {ps.map((p) => {
          const z = zones.find((x) => x.id === p.zoneId);
          return (
            <Card key={p.id} style={{ gap: 8, padding: 14 }}>
              <TaggedPhoto src={p.src} defects={p.defects} height={180} radius={12} />
              <Row style={{ justifyContent: 'space-between' }}>
                <View><T size={15} w="b">{z?.name}</T><T size={12.5} color={p.defects.length ? C.red : C.muted}>{p.defects.length ? p.defects.map((d) => d.label).join(', ') : '하자 표시 없음'}</T></View>
                <Pressable onPress={() => setObjectFor(objectFor === p.zoneId ? null : p.zoneId)}><T size={13} w="m" color={C.accent}>이의 남기기</T></Pressable>
              </Row>
              {objectFor === p.zoneId && <TextInput nativeID={`objection-${p.id}`} autoFocus value={comment} onChangeText={setComment} placeholder="어떤 점이 다른가요?" placeholderTextColor={C.muted} style={s.field} />}
            </Card>
          );
        })}
        {!!err && <T size={12.5} color={C.red}>{err}</T>}
        {confirm.status === 'none' && <T size={12.5} color={C.muted}>아직 보낸 확인 요청이 없어요. 확인서에서 먼저 보내 주세요.</T>}
        <View style={{ gap: 6 }}>
          <T size={12.5} w="m" color={C.muted}>확인자 이름</T>
          <TextInput nativeID="signer" value={signer} onChangeText={setSigner} style={s.field} />
        </View>
      </Screen>
    </View>
  );
}
