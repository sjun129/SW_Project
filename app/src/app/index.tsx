import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import { useStore } from '@/store';
import { C } from '@/theme';
import { APP_ICON, Btn, Header, LOGO_FULL, s, Screen, T } from '@/ui';

export default function Login() {
  const { setLoggedIn } = useStore();
  const [id, setId] = useState('jachwi_minji');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const login = () => {
    if (!id.trim() || !pw) return setErr('아이디와 비밀번호를 입력해 주세요.');
    setLoggedIn(true);
    router.replace('/home');
  };
  return (
    <Screen bg={C.surface} header={<Header title="로그인" back={false} />} pad={24}>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 36 }}>
        <Image source={APP_ICON} style={{ width: 96, height: 96, borderRadius: 22 }} />
        <Image source={LOGO_FULL} style={{ width: 170, height: 58 }} resizeMode="contain" />
        <T size={13} color={C.muted}>다시 오셨네요, 반가워요!</T>
      </View>
      <View style={{ gap: 6, marginTop: 14 }}>
        <T size={12.5} w="m" color={C.muted}>아이디</T>
        <TextInput nativeID="login-id" value={id} onChangeText={setId} autoCapitalize="none" style={s.field} placeholder="아이디" placeholderTextColor={C.muted} />
      </View>
      <View style={{ gap: 6 }}>
        <T size={12.5} w="m" color={C.muted}>비밀번호</T>
        <TextInput nativeID="login-pw" value={pw} onChangeText={setPw} secureTextEntry style={s.field} placeholder="비밀번호" placeholderTextColor={C.muted} onSubmitEditing={login} />
      </View>
      {!!err && <T size={12.5} color={C.red}>{err}</T>}
      <View style={{ gap: 10, marginTop: 8 }}>
        <Btn label="로그인" onPress={login} />
        <Btn label="가입하기" kind="soft" onPress={() => { setLoggedIn(true); router.push('/lease-register?from=signup'); }} />
      </View>
      <Pressable style={{ alignSelf: 'center' }}><T size={12.5} color={C.muted} style={{ textDecorationLine: 'underline' }}>아이디 · 비밀번호 찾기</T></Pressable>
    </Screen>
  );
}
