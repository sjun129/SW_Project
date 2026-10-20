import { Pressable, View } from 'react-native';
import { fmtTime, useStore, type Noti } from '@/store';
import { C } from '@/theme';
import { Header, IconBox, Mascot, Row, Screen, T } from '@/ui';

const TONE: Record<Noti['tone'], [string, string]> = { accent: [C.soft, C.accent], ok: [C.okSoft, C.ok], muted: [C.sunk, C.muted], red: ['#F8E7E9', C.red] };

export default function Notifications() {
  const { notis, markAllRead } = useStore();
  const today = new Date().toDateString();
  const groups: [string, Noti[]][] = [['오늘', notis.filter((n) => new Date(n.time).toDateString() === today)], ['이전', notis.filter((n) => new Date(n.time).toDateString() !== today)]];
  return (
    <Screen gap={8} header={<Header title="알림" right={<Pressable onPress={markAllRead}><T size={13} w="m" color={C.accent}>모두 읽음</T></Pressable>} />}>
      {notis.length === 0 && <View style={{ alignItems: 'center', gap: 10, paddingTop: 60 }}><Mascot name="bye" size={88} /><T color={C.muted}>새 알림이 없어요</T></View>}
      {groups.filter(([, l]) => l.length).map(([title, list]) => (
        <View key={title} style={{ gap: 8 }}>
          <T size={13} w="b" color={C.muted}>{title}</T>
          <View style={{ backgroundColor: C.surface, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 4 }}>
            {list.map((n) => (
              <Row key={n.id} gap={12} center={false} style={{ paddingVertical: 12 }}>
                <IconBox name={n.icon} size={36} bg={TONE[n.tone][0]} color={TONE[n.tone][1]} />
                <View style={{ flex: 1 }}><T size={14} w="b">{n.title}</T><T size={12.5} color={C.muted}>{n.body}</T></View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <T size={11.5} color={C.muted}>{fmtTime(n.time).slice(title === '오늘' ? -5 : 0, title === '오늘' ? undefined : 7)}</T>
                  {n.unread && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }} />}
                </View>
              </Row>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}
