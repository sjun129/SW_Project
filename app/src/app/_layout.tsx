import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono';
import { NotoSansKR_400Regular, NotoSansKR_500Medium, NotoSansKR_700Bold, NotoSansKR_900Black, useFonts } from '@expo-google-fonts/noto-sans-kr';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '@/store';
import { C } from '@/theme';

const sheet = { presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } } as const;

export default function RootLayout() {
  const [loaded] = useFonts({ NotoSansKR_400Regular, NotoSansKR_500Medium, NotoSansKR_700Bold, NotoSansKR_900Black, IBMPlexMono_400Regular });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="capture" options={sheet} />
          <Stack.Screen name="share" options={sheet} />
          <Stack.Screen name="camera" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
