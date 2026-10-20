import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useStore } from '@/store';
import { C } from '@/theme';
import { Icon, Row, Sheet, T, type IconName } from '@/ui';

const CHANNELS: { t: string; icon?: IconName; bg: string; fg: string }[] = [
  { t: '카카오톡', bg: C.kakao, fg: C.kakaoInk }, { t: '문자', icon: 'message-square', bg: C.soft, fg: C.accent }, { t: '링크 복사', icon: 'link', bg: C.soft, fg: C.accent },
];

export default function Share() {
  const { sendConfirm, lease } = useStore();
  const unit = lease.address.split(' ').at(-1) ?? '';
  const send = (ch: string) => { sendConfirm(ch); router.back(); };
  return (
    <Sheet>
      <T size={19} w="b">임대인에게 확인 요청</T>
      <T size={13} color={C.muted} style={{ marginTop: -8 }}>앱 설치 없이 링크에서 바로 확인하고 서명할 수 있어요.</T>
      <View style={{ backgroundColor: C.bg, borderRadius: 16, padding: 14, gap: 6 }}>
        <T size={11.5} w="b" color={C.muted}>보낼 메시지</T>
        <T size={13.5}>안녕하세요, {unit} 세입자입니다. 서로 편하자고 입주 당일 방 상태를 기록해 두었어요. 확인 부탁드려요!</T>
        <T size={11} w="mono" color={C.muted}>jachwisillok.kr/c/k3x9a2qf · 7일 후 만료</T>
      </View>
      <Row gap={10}>
        {CHANNELS.map((c) => (
          <Pressable key={c.t} onPress={() => send(c.t)} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
              {c.icon ? <Icon name={c.icon} size={22} color={c.fg} /> : <T size={12} w="k" color={c.fg}>TALK</T>}
            </View>
            <T size={12.5} w="m">{c.t}</T>
          </Pressable>
        ))}
      </Row>
      <T size={12} color={C.muted}>응답이 없어도 발송·열람 기록이 증빙으로 남아요.</T>
    </Sheet>
  );
}
