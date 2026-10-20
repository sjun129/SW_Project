import { Feather } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/theme';
import { T, type IconName } from '@/ui';

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'home', label: '홈', icon: 'home' },
  { name: 'records', label: '기록', icon: 'grid' },
  { name: 'reports', label: '리포트', icon: 'file-text' },
  { name: 'myhome', label: '내 집', icon: 'user' },
];

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const active = state.routes[state.index]?.name;
  const item = (t: (typeof TABS)[number]) => {
    const on = t.name === active;
    const key = state.routes.find((r) => r.name === t.name)?.key;
    return (
      <Pressable key={t.name} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => key && navigateToTab(key)} style={st.item}>
        <Feather name={t.icon} size={22} color={on ? C.accent : C.muted} />
        <T size={11} w={on ? 'b' : 'm'} color={on ? C.accent : C.muted}>{t.label}</T>
      </Pressable>
    );
  };
  return (
    <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {item(TABS[0])}{item(TABS[1])}
      <View style={st.item}>
        <Pressable accessibilityRole="button" accessibilityLabel="촬영" onPress={() => router.push('/capture')} style={st.fab}>
          <Feather name="camera" size={24} color={C.accentInk} />
        </Pressable>
      </View>
      {item(TABS[2])}{item(TABS[3])}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }} tabBar={(p) => <TabBar {...p} />}>
      {TABS.map((t) => <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />)}
    </Tabs>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, paddingHorizontal: 14 },
  item: { flex: 1, alignItems: 'center', gap: 3, height: 48, justifyContent: 'center' },
  fab: {
    position: 'absolute', top: -26, width: 56, height: 56, borderRadius: 28, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#304166', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
});
