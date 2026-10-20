import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useStore } from '@/store';
import { C } from '@/theme';
import { Card, Header, Icon, IconBox, Pill, Row, Screen, T, type IconName } from '@/ui';

export default function MyHome() {
  const { lease, leases, switchLease, setLoggedIn } = useStore();
  const others = leases.filter((l) => !l.current);
  return (
    <Screen gap={12} header={<Header title="내 집" back={false} />}>
      <Card style={{ padding: 18, gap: 10, borderRadius: 20 }}>
        <Pill label="지금 사는 집" tone="accent" />
        <T size={16} w="b">{lease.address}</T>
        {[['계약 기간', `${lease.start} ~ ${lease.end}`], ['보증금', `${lease.deposit}원`], ['임대인', lease.landlord || '미입력']].map(([k, v]) => (
          <Row key={k} gap={12}><T size={13} color={C.muted} style={{ width: 64 }}>{k}</T><T size={13} style={{ flex: 1 }}>{v}</T></Row>
        ))}
      </Card>
      {others.map((l) => (
        <Card key={l.id} onPress={() => switchLease(l.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBox name="key" bg={C.sunk} color={C.muted} />
          <View style={{ flex: 1 }}><T size={14} w="b">{l.address}</T><T size={12.5} color={C.muted}>{l.start.slice(0, 7)} ~ {l.end.slice(0, 7)} · 눌러서 전환</T></View>
          <Icon name="chevron-right" size={18} color={C.muted} />
        </Card>
      ))}
      <Pressable onPress={() => router.push('/lease-register')} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line }}>
        <Icon name="plus" size={18} color={C.accent} /><T size={14} w="b" color={C.accent}>새 집 추가</T>
      </Pressable>
      <View style={{ backgroundColor: C.surface, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 4 }}>
        {([['임대인 연락처 관리', 'phone'], ['알림 설정', 'settings'], ['기록 보존 기간', 'archive'], ['로그아웃', 'log-out']] as [string, IconName][]).map(([t, ic]) => (
          <Pressable key={t} onPress={t === '로그아웃' ? () => { setLoggedIn(false); router.replace('/'); } : undefined}>
            <Row gap={12} style={{ paddingVertical: 14 }}><Icon name={ic} size={18} color={C.muted} /><T size={14} style={{ flex: 1 }}>{t}</T><Icon name="chevron-right" size={16} color={C.muted} /></Row>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
