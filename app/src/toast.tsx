import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from './store';
import { C } from './theme';
import { Icon, T } from './ui';

/** Banner for live notices from the server (e.g. the landlord just signed). Tap opens notifications. */
export function LiveToast() {
  const { toast, setToast } = useStore();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast, setToast]);
  if (!toast) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12 }}>
      <Pressable accessibilityRole="alert" onPress={() => { setToast(null); router.push('/notifications'); }}
        style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.accent, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
        <Icon name="bell" size={18} color="#fff" />
        <View style={{ flex: 1 }}>
          <T size={14} w="b" color="#fff">{toast.title}</T>
          {!!toast.body && <T size={12.5} color="rgba(255,255,255,0.8)" lines={2}>{toast.body}</T>}
        </View>
        <Pressable hitSlop={10} accessibilityLabel="알림 닫기" onPress={() => setToast(null)}><Icon name="x" size={16} color="#fff" /></Pressable>
      </Pressable>
    </View>
  );
}
