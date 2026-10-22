import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, TextInput, View } from 'react-native';
import { authErrorKo, supabase, supabaseConfigured } from '@/lib/supabase';
import { errText, useStore } from '@/store';
import { C } from '@/theme';
import { APP_ICON, Btn, Header, LOGO_FULL, s, Screen, T } from '@/ui';

export default function Login() {
  const { connect, resetDemo, setLoggedIn } = useStore();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setMsg({ text: '이메일 형식을 확인해 주세요.' }); return false; }
    if (pw.length < 6) { setMsg({ text: '비밀번호는 6자 이상이어야 해요.' }); return false; }
    return true;
  };
  const run = async (fn: () => Promise<void>) => { setBusy(true); setMsg(null); try { await fn(); } catch (e) { setMsg({ text: errText(e) }); } finally { setBusy(false); } };
  const enter = async () => router.replace((await connect()) ? '/home' : '/lease-register?from=signup');

  // resume a saved session without asking for the password again
  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => { if (data.session) run(enter); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = () => valid() && run(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) return setMsg({ text: authErrorKo(error.message) });
    await enter();
  });
  const signup = () => valid() && run(async () => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pw });
    if (error) return setMsg({ text: authErrorKo(error.message) });
    if (data.session) return enter();
    setMsg({ ok: true, text: `${email.trim()}로 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.` });
  });
  const reset = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setMsg({ text: '비밀번호를 찾을 이메일을 먼저 입력해 주세요.' });
    run(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: Linking.createURL('/reset-password') });
      if (error) return setMsg({ text: authErrorKo(error.message) });
      setMsg({ ok: true, text: `${email.trim()}로 비밀번호 재설정 메일을 보냈어요.` });
    });
  };
  const demo = () => { resetDemo(); setLoggedIn(true); router.replace('/home'); };

  return (
    <Screen bg={C.surface} header={<Header title="로그인" back={false} />} pad={24}>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 28 }}>
        <Image source={APP_ICON} style={{ width: 96, height: 96, borderRadius: 22 }} />
        <Image source={LOGO_FULL} style={{ width: 170, height: 58 }} resizeMode="contain" />
        <T size={13} color={C.muted}>다시 오셨네요, 반가워요!</T>
      </View>
      <View style={{ gap: 6, marginTop: 14 }}>
        <T size={12.5} w="m" color={C.muted}>이메일</T>
        <TextInput nativeID="login-email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" style={s.field} placeholder="you@example.com" placeholderTextColor={C.muted} />
      </View>
      <View style={{ gap: 6 }}>
        <T size={12.5} w="m" color={C.muted}>비밀번호</T>
        <TextInput nativeID="login-pw" value={pw} onChangeText={setPw} secureTextEntry autoComplete="password" style={s.field} placeholder="6자 이상" placeholderTextColor={C.muted} onSubmitEditing={login} />
      </View>
      {msg && <T size={12.5} color={msg.ok ? C.ok : C.red}>{msg.text}</T>}
      {!supabaseConfigured && <T size={12} color={C.muted}>서버 설정(.env.local)이 없어 둘러보기만 할 수 있어요.</T>}
      <View style={{ gap: 10, marginTop: 8 }}>
        <Btn label="로그인" onPress={login} disabled={busy || !supabaseConfigured} />
        <Btn label="가입하기" kind="soft" onPress={signup} disabled={busy || !supabaseConfigured} />
      </View>
      {busy && <ActivityIndicator color={C.accent} />}
      {supabaseConfigured && <Pressable onPress={reset} style={{ alignSelf: 'center' }}><T size={12.5} color={C.muted} style={{ textDecorationLine: 'underline' }}>비밀번호를 잊으셨나요?</T></Pressable>}
      <Pressable onPress={demo} style={{ alignSelf: 'center' }}><T size={12.5} color={C.muted} style={{ textDecorationLine: 'underline' }}>로그인 없이 둘러보기 (데모 데이터)</T></Pressable>
    </Screen>
  );
}
