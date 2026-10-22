import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { authErrorKo, supabase, supabaseConfigured } from '@/lib/supabase';
import { errText, useStore } from '@/store';
import { C } from '@/theme';
import { Btn, Header, s, Screen, T } from '@/ui';

export default function ResetPassword() {
  const { connect } = useStore();
  const { code, error_description: description } = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [exchangeError, setExchangeError] = useState('');
  const exchanged = useRef(false);
  const linkError = description
    ? String(description)
    : !supabaseConfigured
      ? '서버 설정이 없어 비밀번호를 바꿀 수 없어요.'
      : typeof code !== 'string' || !code
        ? '재설정 링크가 없거나 만료됐어요. 로그인 화면에서 다시 요청해 주세요.'
        : '';
  const visibleMessage = message || exchangeError || linkError;

  useEffect(() => {
    if (description || !supabaseConfigured || typeof code !== 'string' || !code || exchanged.current) return;
    exchanged.current = true;
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setExchangeError(authErrorKo(error.message));
      else setReady(true);
    }).catch((error: unknown) => setExchangeError(errText(error)));
  }, [code, description]);

  const save = async () => {
    if (password.length < 6) return setMessage('새 비밀번호는 6자 이상이어야 해요.');
    if (password !== repeat) return setMessage('비밀번호가 서로 달라요.');
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(authErrorKo(error.message));
      router.replace((await connect()) ? '/home' : '/lease-register?from=signup');
    } catch (error) { setMessage(errText(error)); } finally { setBusy(false); }
  };

  return (
    <Screen bg={C.surface} header={<Header title="비밀번호 재설정" />} pad={24}>
      <View style={{ gap: 8, paddingTop: 20 }}>
        <T size={20} w="b">새 비밀번호를 정해 주세요</T>
        <T size={13} color={C.muted}>재설정 링크가 확인되면 새 비밀번호를 저장할 수 있어요.</T>
      </View>
      {!ready && !message && <ActivityIndicator color={C.accent} />}
      {ready && <>
        <TextInput nativeID="new-password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="새 비밀번호 (6자 이상)" placeholderTextColor={C.muted} style={s.field} />
        <TextInput nativeID="repeat-password" value={repeat} onChangeText={setRepeat} secureTextEntry autoComplete="new-password" placeholder="새 비밀번호 확인" placeholderTextColor={C.muted} style={s.field} onSubmitEditing={save} />
        <Btn label={busy ? '저장 중…' : '비밀번호 저장'} disabled={busy} onPress={save} />
      </>}
      {!!visibleMessage && <T size={13} color={C.red}>{visibleMessage}</T>}
      {visibleMessage && <Btn kind="soft" label="로그인 화면으로" onPress={() => router.replace('/')} />}
    </Screen>
  );
}
