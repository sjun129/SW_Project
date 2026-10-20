import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { cancelMoveOutReminder, prefs, RETENTION_LABEL, scheduleMoveOutReminder, type Retention } from '@/lib/reminder';
import { supabase } from '@/lib/supabase';
import { errText, useStore } from '@/store';
import { C } from '@/theme';
import { Card, Chip, Header, Icon, IconBox, Pill, Row, Screen, T } from '@/ui';

const REMINDER_MSG = { scheduled: '계약 만료 30일 전에 알려 드려요.', denied: '알림 권한이 꺼져 있어요. 설정에서 허용해 주세요.', past: '만료 30일 전이 이미 지나서 예약하지 않았어요.', unsupported: 'Expo Go와 웹에서는 알림을 예약할 수 없어요. 앱으로 설치(개발 빌드)하면 동작해요.' };

export default function MyHome() {
  const { lease, leases, switchLease, setLoggedIn, resetDemo, mode } = useStore();
  const others = leases.filter((l) => !l.current);
  const [reminder, setReminder] = useState(true);
  const [retention, setRetention] = useState<Retention>('3y');
  const [note, setNote] = useState('');
  const [openRetention, setOpenRetention] = useState(false);
  useEffect(() => { prefs.get().then((p) => { setReminder(p.reminder); setRetention(p.retention); }); }, []);

  const toggleReminder = async (on: boolean) => {
    setReminder(on); prefs.setReminder(on);
    try {
      if (!on) { await cancelMoveOutReminder(); setNote('퇴거 알림을 껐어요.'); return; }
      setNote(REMINDER_MSG[await scheduleMoveOutReminder(lease.end)]);
    } catch (e) { setNote(errText(e)); }
  };
  const logout = async () => { if (mode === 'remote') await supabase.auth.signOut(); resetDemo(); setLoggedIn(false); router.replace('/'); };

  return (
    <Screen gap={12} header={<Header title="내 집" back={false} />}>
      <Card style={{ padding: 18, gap: 10, borderRadius: 20 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pill label="지금 사는 집" tone="accent" />
          <Pressable onPress={() => router.push('/lease-register?edit=1')}><T size={13} w="m" color={C.accent}>수정</T></Pressable>
        </Row>
        <T size={16} w="b">{lease.address}</T>
        {[['계약 기간', `${lease.start} ~ ${lease.end}`], ['보증금', `${lease.deposit}원`], ['임대인', lease.landlord || '미입력']].map(([k, v]) => (
          <Row key={k} gap={12}><T size={13} color={C.muted} style={{ width: 64 }}>{k}</T><T size={13} style={{ flex: 1 }}>{v}</T></Row>
        ))}
      </Card>
      {others.map((l) => (
        <Card key={l.id} onPress={() => void switchLease(l.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBox name="key" bg={C.sunk} color={C.muted} />
          <View style={{ flex: 1 }}><T size={14} w="b">{l.address}</T><T size={12.5} color={C.muted}>{l.start.slice(0, 7)} ~ {l.end.slice(0, 7)} · 눌러서 전환</T></View>
          <Icon name="chevron-right" size={18} color={C.muted} />
        </Card>
      ))}
      <Pressable onPress={() => router.push('/lease-register')} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line }}>
        <Icon name="plus" size={18} color={C.accent} /><T size={14} w="b" color={C.accent}>새 집 추가</T>
      </Pressable>

      <View style={{ backgroundColor: C.surface, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 4 }}>
        <Pressable onPress={() => router.push('/lease-register?edit=1')}>
          <Row gap={12} style={{ paddingVertical: 14 }}><Icon name="phone" size={18} color={C.muted} /><T size={14} style={{ flex: 1 }}>임대인 연락처 관리</T><T size={12.5} color={C.muted}>{lease.landlord || '미입력'}</T><Icon name="chevron-right" size={16} color={C.muted} /></Row>
        </Pressable>
        <Row gap={12} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line }}>
          <Icon name="bell" size={18} color={C.muted} />
          <View style={{ flex: 1 }}><T size={14}>퇴거 알림</T><T size={12} color={C.muted}>계약 만료 30일 전에 퇴거 촬영을 알려 드려요</T></View>
          <Switch value={reminder} onValueChange={toggleReminder} trackColor={{ true: C.accent, false: C.line }} thumbColor="#fff" />
        </Row>
        {!!note && <T size={12} color={C.muted} style={{ paddingBottom: 8 }}>{note}</T>}
        <Pressable onPress={() => setOpenRetention(!openRetention)}>
          <Row gap={12} style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.line }}><Icon name="archive" size={18} color={C.muted} /><T size={14} style={{ flex: 1 }}>기록 보존 기간</T><T size={12.5} color={C.muted}>{RETENTION_LABEL[retention]}</T><Icon name={openRetention ? 'chevron-up' : 'chevron-down'} size={16} color={C.muted} /></Row>
        </Pressable>
        {openRetention && (
          <View style={{ gap: 8, paddingBottom: 12 }}>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              {(Object.keys(RETENTION_LABEL) as Retention[]).map((r) => <Chip key={r} label={RETENTION_LABEL[r]} on={r === retention} onPress={() => { setRetention(r); prefs.setRetention(r); }} />)}
            </Row>
            <T size={11.5} color={C.muted}>분쟁에 대비해 원본을 보관할 기간이에요. 지금은 이 기기에만 저장되고, 서버 자동 삭제는 아직 연결되지 않았어요.</T>
          </View>
        )}
        <Pressable onPress={() => router.push('/verify')}>
          <Row gap={12} style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.line }}><Icon name="shield" size={18} color={C.muted} /><T size={14} style={{ flex: 1 }}>원본 검증</T><Icon name="chevron-right" size={16} color={C.muted} /></Row>
        </Pressable>
        <Pressable onPress={logout}>
          <Row gap={12} style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.line }}><Icon name="log-out" size={18} color={C.muted} /><T size={14} style={{ flex: 1 }}>로그아웃</T></Row>
        </Pressable>
      </View>
    </Screen>
  );
}
