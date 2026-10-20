import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Defect } from './store';
import { C, FONT, LEGAL } from './theme';

export type IconName = ComponentProps<typeof Feather>['name'];
type W = keyof typeof FONT;

export function T({ children, size = 15, w = 'r', color = C.ink, style, lines }: { children: ReactNode; size?: number; w?: W; color?: string; style?: StyleProp<TextStyle>; lines?: number }) {
  return <Text numberOfLines={lines} style={[{ fontFamily: FONT[w], fontSize: size, color, lineHeight: Math.round(size * (w === 'mono' ? 1.45 : 1.45)) }, style]}>{children}</Text>;
}

export const Icon = ({ name, size = 20, color = C.ink }: { name: IconName; size?: number; color?: string }) => <Feather name={name} size={size} color={color} />;

export function IconBox({ name, size = 40, bg = C.soft, color = C.accent, radius = 12 }: { name: IconName; size?: number; bg?: string; color?: string; radius?: number }) {
  return <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Icon name={name} size={size / 2} color={color} /></View>;
}

type BtnKind = 'primary' | 'soft' | 'ghost' | 'kakao';
const BTN: Record<BtnKind, { bg: string; fg: string; border?: string }> = {
  primary: { bg: C.accent, fg: C.accentInk }, soft: { bg: C.soft, fg: C.accent }, ghost: { bg: C.surface, fg: C.ink, border: C.line }, kakao: { bg: C.kakao, fg: C.kakaoInk },
};
export function Btn({ label, onPress, kind = 'primary', disabled, style, icon }: { label: string; onPress?: () => void; kind?: BtnKind; disabled?: boolean; style?: StyleProp<ViewStyle>; icon?: IconName }) {
  const k = BTN[kind];
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: k.bg, borderColor: k.border ?? k.bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }, style]}>
      {icon && <Icon name={icon} size={18} color={k.fg} />}
      <T w="b" color={k.fg} size={15.5}>{label}</T>
    </Pressable>
  );
}

type Tone = 'neutral' | 'accent' | 'ok' | 'red' | 'soft';
const PILL: Record<Tone, [string, string]> = { neutral: [C.sunk, C.muted], accent: [C.accent, C.accentInk], ok: [C.okSoft, C.ok], red: [C.red, '#fff'], soft: [C.soft, C.accent] };
export const Pill = ({ label, tone = 'neutral' }: { label: string; tone?: Tone }) => (
  <View style={[s.pill, { backgroundColor: PILL[tone][0] }]}><T size={11.5} w="b" color={PILL[tone][1]}>{label}</T></View>
);

export const Chip = ({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) => (
  <Pressable onPress={onPress} style={[s.chip, on ? { backgroundColor: C.soft, borderColor: C.accent, borderWidth: 1.5 } : null]}>
    <T size={12.5} w={on ? 'b' : 'r'} color={on ? C.accent : C.muted}>{label}</T>
  </Pressable>
);

export const Card = ({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) =>
  onPress ? <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }, style]}>{children}</Pressable> : <View style={[s.card, style]}>{children}</View>;

export const Row = ({ children, gap = 8, style, center = true }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; center?: boolean }) =>
  <View style={[{ flexDirection: 'row', gap, alignItems: center ? 'center' : 'flex-start' }, style]}>{children}</View>;

export const Legal = () => <View style={s.legal}><T size={12} color={C.muted}>{LEGAL}</T></View>;

export function Mascot({ name, size = 52 }: { name: keyof typeof MASCOT; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: C.ivory, overflow: 'hidden' }}><Image source={MASCOT[name]} style={{ width: size, height: size }} resizeMode="cover" /></View>;
}
export const MASCOT = {
  think: require('../assets/img/m-think.png'), search: require('../assets/img/m-search.png'), proof: require('../assets/img/m-proof.png'),
  bye: require('../assets/img/m-bye.png'), safe: require('../assets/img/m-safe.png'), honest: require('../assets/img/m-honest.png'), checked: require('../assets/img/m-checked.png'),
};
export const LOGO_COMPACT = require('../assets/img/logo-compact.png');
export const LOGO_FULL = require('../assets/img/logo-full.png');
export const APP_ICON = require('../assets/img/app-icon.png');

/** Plain screen: safe-area top, optional header, scrollable content, optional pinned footer. */
export function Screen({ children, header, footer, bg = C.bg, scroll = true, pad = 16, gap = 14 }: { children: ReactNode; header?: ReactNode; footer?: ReactNode; bg?: string; scroll?: boolean; pad?: number; gap?: number }) {
  const body = <View style={{ paddingHorizontal: pad, paddingTop: 12, paddingBottom: 28, gap }}>{children}</View>;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: header ? C.surface : bg }}>
      {header}
      <View style={{ flex: 1, backgroundColor: bg }}>
        {scroll ? <ScrollView showsVerticalScrollIndicator={false}>{body}</ScrollView> : body}
      </View>
      {footer}
    </SafeAreaView>
  );
}

export function Header({ title, back = true, right, onBack }: { title?: string; back?: boolean; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={[s.header, !back && { paddingLeft: 20 }]}>
      {back && <Pressable hitSlop={12} accessibilityLabel="뒤로" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/home')))}><Icon name="chevron-left" size={26} /></Pressable>}
      {title ? <T size={18} w="b" style={{ flex: 1 }}>{title}</T> : <View style={{ flex: 1 }} />}
      {right}
    </View>
  );
}

export function Footer({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>{children}</View>;
}

/** Dimmed backdrop + bottom sheet used by transparent-modal routes. */
export function Sheet({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable accessibilityLabel="닫기" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,20,30,0.45)' }]} onPress={() => router.back()} />
      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 18 }]}>
        <View style={s.handle} />
        {children}
      </View>
    </View>
  );
}

/** Photo with defect boxes. onPressAt gives the relative (0..1) tap position for adding a user tag. */
export function TaggedPhoto({ src, defects, height = 260, radius = 16, onPressAt, diff }: { src: ImageSourcePropType; defects: Defect[]; height?: number; radius?: number; onPressAt?: (x: number, y: number) => void; diff?: boolean }) {
  const [width, setWidth] = useState(1);
  return (
    <Pressable disabled={!onPressAt} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onPress={(e) => {
        // react-native-web leaves locationX undefined on some targets; fall back to the DOM offset
        const ne = e.nativeEvent as unknown as { locationX?: number; locationY?: number; offsetX?: number; offsetY?: number };
        const x = ne.locationX ?? ne.offsetX ?? 0, y = ne.locationY ?? ne.offsetY ?? 0;
        onPressAt?.(Math.min(1, x / width), Math.min(1, y / height));
      }}
      style={{ height, borderRadius: radius, overflow: 'hidden', backgroundColor: C.photo }}>
      <Image source={src} style={StyleSheet.absoluteFill} resizeMode="cover" />
      {defects.map((d) => {
        const color = diff ? C.red : d.source === 'user' ? '#4FC3FF' : C.tag;
        return (
          <View key={d.id} pointerEvents="none" style={{ position: 'absolute', left: `${d.x * 100}%`, top: `${d.y * 100}%`, width: `${d.w * 100}%`, height: `${d.h * 100}%`, borderWidth: 2.5, borderColor: color, borderRadius: 6, backgroundColor: diff ? 'rgba(195,59,73,0.18)' : undefined }}>
            <View style={{ position: 'absolute', top: -22, left: -2, backgroundColor: color, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 1 }}>
              <T size={11} w="b" color={diff ? '#fff' : C.ink}>{diff ? '변화' : d.label + (d.conf ? ` · AI ${d.conf}%` : '')}</T>
            </View>
          </View>
        );
      })}
    </Pressable>
  );
}

export const Section = ({ title, link, onLink, children, gap = 12 }: { title: string; link?: string; onLink?: () => void; children: ReactNode; gap?: number }) => (
  <View style={{ gap }}>
    <Row style={{ justifyContent: 'space-between' }}><T size={17} w="b">{title}</T>{link && <Pressable onPress={onLink}><T size={13} w="m" color={C.muted}>{link}</T></Pressable>}</Row>
    {children}
  </View>
);

export const s = StyleSheet.create({
  btn: { flexDirection: 'row', gap: 6, height: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingHorizontal: 16, flexGrow: 1 },
  pill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 6 },
  card: { backgroundColor: C.surface, borderRadius: 18, padding: 16, gap: 8 },
  legal: { borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  header: { height: 60, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 16 },
  footer: { backgroundColor: C.surface, flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, gap: 14 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line },
  field: { backgroundColor: C.field, borderRadius: 12, paddingHorizontal: 16, height: 52, fontFamily: FONT.r, fontSize: 15, color: C.ink },
});
