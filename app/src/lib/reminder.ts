import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

const ID = 'move-out-reminder';
const DAY = 86400000;

// expo-notifications needs native pieces that Expo Go (Android) does not ship; importing it at startup
// crashes the whole app there. Load it lazily, and only outside Expo Go / web.
const supported = Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
let handlerSet = false;
async function notifications() {
  if (!supported) return null;
  try {
    const N = await import('expo-notifications');
    if (!handlerSet) {
      N.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
      handlerSet = true;
    }
    return N;
  } catch { return null; }
}

/** FR-13: one local notification 30 days before the lease ends. */
export async function scheduleMoveOutReminder(endDate: string): Promise<'scheduled' | 'denied' | 'past' | 'unsupported'> {
  const N = await notifications();
  if (!N) return 'unsupported';
  const perm = await N.requestPermissionsAsync();
  if (!perm.granted) return 'denied';
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync('reminders', { name: '퇴거 알림', importance: N.AndroidImportance.DEFAULT });
  }
  await N.cancelScheduledNotificationAsync(ID).catch(() => {});
  const at = new Date(`${endDate}T10:00:00+09:00`).getTime() - 30 * DAY;
  if (at <= Date.now()) return 'past';
  await N.scheduleNotificationAsync({
    identifier: ID,
    content: { title: '퇴거 촬영할 때가 됐어요', body: '계약 만료 30일 전이에요. 입주 때와 같은 구도로 퇴거 사진을 찍어 두세요.' },
    trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at, channelId: 'reminders' },
  });
  return 'scheduled';
}

export async function cancelMoveOutReminder() {
  const N = await notifications();
  await N?.cancelScheduledNotificationAsync(ID).catch(() => {});
}

// ---------------------------------------------------------------- small per-device preferences
export type Retention = '1y' | '3y' | '5y';
export const RETENTION_LABEL: Record<Retention, string> = { '1y': '계약 종료 후 1년', '3y': '계약 종료 후 3년', '5y': '계약 종료 후 5년' };

export const prefs = {
  async get() {
    try {
      const [r, n] = await Promise.all([AsyncStorage.getItem('pref.retention'), AsyncStorage.getItem('pref.reminder')]);
      return { retention: (r as Retention) ?? '3y', reminder: n !== 'off' };
    } catch { return { retention: '3y' as Retention, reminder: true }; }
  },
  setRetention: (r: Retention) => AsyncStorage.setItem('pref.retention', r).catch(() => {}),
  setReminder: (on: boolean) => AsyncStorage.setItem('pref.reminder', on ? 'on' : 'off').catch(() => {}),
};
