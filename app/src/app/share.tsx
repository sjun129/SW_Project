import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, Share, View } from 'react-native';
import { errText, useStore } from '@/store';
import { C } from '@/theme';
import { Icon, Row, Sheet, T, type IconName } from '@/ui';

type Channel = { t: string; icon?: IconName; bg: string; fg: string };
const CHANNELS: Channel[] = [
  { t: '카카오톡', bg: C.kakao, fg: C.kakaoInk }, { t: '문자', icon: 'message-square', bg: C.soft, fg: C.accent }, { t: '링크 복사', icon: 'link', bg: C.soft, fg: C.accent },
];

/** FR-09: creates the landlord link, then hands it to KakaoTalk (system share sheet), SMS, or the clipboard. */
export default function ShareSheet() {
  const { sendConfirm, lease } = useStore();
  const unit = lease.address.split(' ').at(-1) ?? '';
  const intro = `안녕하세요, ${unit} 세입자입니다. 서로 편하자고 입주 당일 방 상태를 기록해 두었어요. 앱 설치 없이 링크에서 확인 부탁드려요!`;
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (ch: string) => {
    setBusy(true); setErr('');
    try {
      const link = await sendConfirm(ch);
      const msg = `${intro}\n${link}`;
      if (ch === '링크 복사') {
        await Clipboard.setStringAsync(msg);
        setCopied(link);
        return;
      }
      if (ch === '문자') {
        const phone = lease.landlord.replace(/[^\d+]/g, '');
        await Linking.openURL(`sms:${phone}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(msg)}`).catch(() => Share.share({ message: msg }));
      } else {
        // KakaoTalk is picked from the system share sheet (no Kakao SDK needed in Expo Go)
        await Share.share({ message: msg });
      }
      router.back();
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };

  return (
    <Sheet>
      <T size={19} w="b">임대인에게 확인 요청</T>
      <T size={13} color={C.muted} style={{ marginTop: -8 }}>앱 설치 없이 링크에서 바로 확인하고 서명할 수 있어요.</T>
      <View style={{ backgroundColor: C.bg, borderRadius: 16, padding: 14, gap: 6 }}>
        <T size={11.5} w="b" color={C.muted}>보낼 메시지</T>
        <T size={13.5}>{intro}</T>
        <T size={11} w="mono" color={C.muted}>{copied || '보낼 때 7일짜리 확인 링크가 만들어져요'}</T>
      </View>
      {copied ? (
        <Row gap={8} style={{ backgroundColor: C.okSoft, borderRadius: 12, padding: 12 }}>
          <Icon name="check" size={16} color={C.ok} /><T size={13} w="m" color={C.ok} style={{ flex: 1 }}>메시지와 링크를 복사했어요. 원하는 곳에 붙여 넣어 보내 주세요.</T>
          <Pressable onPress={() => router.back()}><T size={13} w="b" color={C.accent}>닫기</T></Pressable>
        </Row>
      ) : (
        <Row gap={10}>
          {CHANNELS.map((c) => (
            <Pressable key={c.t} disabled={busy} onPress={() => send(c.t)} style={{ flex: 1, alignItems: 'center', gap: 6, opacity: busy ? 0.5 : 1 }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
                {c.icon ? <Icon name={c.icon} size={22} color={c.fg} /> : <T size={12} w="k" color={c.fg}>TALK</T>}
              </View>
              <T size={12.5} w="m">{c.t}</T>
            </Pressable>
          ))}
        </Row>
      )}
      {!!err && <T size={12.5} color={C.red}>{err}</T>}
      {!lease.landlord && <T size={12} color={C.muted}>임대인 연락처가 없어서 문자는 번호 없이 열려요. 내 집 탭에서 추가할 수 있어요.</T>}
      <T size={12} color={C.muted}>응답이 없어도 발송·열람 기록이 증빙으로 남아요.</T>
    </Sheet>
  );
}
