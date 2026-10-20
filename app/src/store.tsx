import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { chainNext, hashPhoto, sha256Text, ZERO_HASH } from './hash';

export type Stage = 'in' | 'live' | 'out';
export const STAGE_LABEL: Record<Stage, string> = { in: '입주', live: '거주 중', out: '퇴거' };
export type Defect = { id: string; label: string; x: number; y: number; w: number; h: number; source: 'ai' | 'user'; conf?: number };
export type Photo = {
  id: string; zoneId: string; stage: Stage; src: ImageSourcePropType; sample: boolean;
  hash: string; deviceTs: number; serverTs: number; defects: Defect[];
};
export type Zone = { id: string; name: string; tip: string };
export type ConfirmStatus = 'none' | 'sent' | 'viewed' | 'signed' | 'objected';
export type Lease = { id: string; address: string; start: string; end: string; deposit: string; landlord: string; current: boolean };
export type Noti = { id: string; icon: 'eye' | 'file-text' | 'alert-triangle' | 'calendar' | 'check-circle'; tone: 'accent' | 'ok' | 'muted' | 'red'; title: string; body: string; time: number; unread: boolean };
export type Activity = { id: string; title: string; detail?: string; time: number };
export type DefectReport = { id: string; category: string; place: string; memo: string; repair: boolean; time: number };

export const SAMPLE = { wall: require('../assets/img/sample-wall.jpg'), floor: require('../assets/img/sample-floor.jpg') };

/** Korean particle 으로/로: '로' after a vowel or ㄹ final consonant, '으로' otherwise. */
export function euro(word: string) {
  const c = word.trim().charCodeAt(word.trim().length - 1) - 0xac00;
  if (c < 0 || c > 11171) return '로';
  const jong = c % 28;
  return jong === 0 || jong === 8 ? '로' : '으로';
}

export const uid = () => Math.random().toString(36).slice(2, 10);

const ZONES: Zone[] = [
  { id: 'entry', name: '현관', tip: '바닥 타일과 현관문 하단이 함께 보이게 찍어 주세요' },
  { id: 'wall', name: '벽지', tip: '창가 쪽 벽 모서리를 위주로, 곰팡이·들뜸을 가까이서' },
  { id: 'floor', name: '바닥', tip: '침대·책상 자리 바닥의 찍힘과 스크래치를 비스듬히' },
  { id: 'bath', name: '욕실 실리콘', tip: '세면대·욕조 실리콘 줄눈이 화면 가운데 오게' },
  { id: 'window', name: '창틀', tip: '레일과 방충망 모서리를 함께 담아 주세요' },
  { id: 'appliance', name: '옵션 가전', tip: '냉장고·세탁기 문을 연 상태로 내부까지' },
];

/** Mock AI tagging (FR-06). Deterministic per zone so the demo is repeatable. */
export function mockDetect(zoneId: string, stage: Stage): Defect[] {
  const table: Record<string, Omit<Defect, 'id' | 'source'>[]> = {
    wall: [{ label: '곰팡이', x: 0.64, y: 0.18, w: 0.22, h: 0.26, conf: 92 }, ...(stage === 'out' ? [{ label: '찢김', x: 0.14, y: 0.5, w: 0.24, h: 0.3, conf: 87 }] : [])],
    floor: [{ label: '스크래치', x: 0.2, y: 0.5, w: 0.32, h: 0.18, conf: 88 }],
    bath: stage === 'out' ? [{ label: '곰팡이', x: 0.34, y: 0.52, w: 0.32, h: 0.18, conf: 81 }] : [],
  };
  return (table[zoneId] ?? []).map((d) => ({ ...d, id: uid(), source: 'ai' as const }));
}

const t0 = new Date('2026-10-14T15:02:00+09:00').getTime();
const SEED: [string, ImageSourcePropType, string][] = [
  ['entry', SAMPLE.floor, '4be1a09c71f2d83e5a0c1b9f6e2d47a8c3b5f1e09d2a6c7b8e4f3a2d1c0b9a73b'],
  ['wall', SAMPLE.wall, '9f2c41ab07de6b3c8a5e1f2d0c9b7a64e3d2c1b0a9f8e7d6c5b4a3928170c81e'],
  ['floor', SAMPLE.floor, '0d7e55c3e9126a4b8c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e25f9b0'],
  ['bath', SAMPLE.wall, 'e1aa9f30c4b7d2e6a8f1c3b5d7e9f0a2c4b6d8e0f1a3c5b7d9e2f4a6c8b00c2d'],
];
const seedPhotos: Photo[] = SEED.map(([zoneId, src, hash], i) => ({
  id: uid(), zoneId, stage: 'in', src, sample: true, hash,
  deviceTs: t0 + 400000 + i * 60000, serverTs: t0 + 400300 + i * 60000, defects: mockDetect(zoneId, 'in'),
}));

function daysUntil(date: string) {
  return Math.ceil((new Date(date + 'T00:00:00+09:00').getTime() - Date.now()) / 86400000);
}

function useStoreValue() {
  const [zones, setZones] = useState<Zone[]>(ZONES);
  const [photos, setPhotos] = useState<Photo[]>(seedPhotos);
  const [chains, setChains] = useState<Record<Stage, string>>({ in: 'cc93ba62c04f656ede5f19378eb457bd524e0d16930d8373576b5c5785dc7d76', live: ZERO_HASH, out: ZERO_HASH });
  const [leases, setLeases] = useState<Lease[]>([
    { id: 'l1', address: '부산 금정구 장전동 ○○빌 302호', start: '2026-03-01', end: '2027-02-28', deposit: '5,000,000', landlord: '010-1234-5678', current: true },
    { id: 'l0', address: '부산 금정구 부곡동 △△원룸 201호', start: '2025-03-01', end: '2026-02-28', deposit: '3,000,000', landlord: '010-9876-5432', current: false },
  ]);
  const [confirm, setConfirm] = useState<{ status: ConfirmStatus; channel?: string; signer?: string; comment?: string }>({ status: 'none' });
  const [notis, setNotis] = useState<Noti[]>([
    { id: 'n1', icon: 'file-text', tone: 'ok', title: '입주 확인서가 준비됐어요', body: '지금 보내거나 나중에 보낼 수 있어요', time: t0 + 600000, unread: true },
    { id: 'n2', icon: 'calendar', tone: 'muted', title: '계약 만료까지 남은 기간을 알려 드려요', body: '퇴거 30일 전에 다시 알려 드려요', time: t0, unread: false },
  ]);
  const [activity, setActivity] = useState<Activity[]>([
    { id: 'a2', title: '바닥 촬영', detail: '하자 1건', time: t0 + 520000 },
    { id: 'a1', title: '벽지 촬영', detail: '하자 1건', time: t0 + 460000 },
    { id: 'a0', title: '집 등록', time: t0 },
  ]);
  const [defectReports, setDefectReports] = useState<DefectReport[]>([]);
  const [paid, setPaid] = useState<Record<string, boolean>>({});
  const [suggestionHidden, setSuggestionHidden] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const lease = leases.find((l) => l.current)!;
  const log = useCallback((title: string, detail?: string) => setActivity((a) => [{ id: uid(), title, detail, time: Date.now() }, ...a]), []);
  const notify = useCallback((n: Omit<Noti, 'id' | 'time' | 'unread'>) => setNotis((l) => [{ ...n, id: uid(), time: Date.now(), unread: true }, ...l]), []);

  /** Lock a captured photo: hash bytes (device), mock server re-hash on receipt, extend the stage's hash chain. */
  const addPhoto = useCallback(async (zoneId: string, stage: Stage, src: ImageSourcePropType, uri: string | null) => {
    const deviceTs = Date.now();
    const hash = uri ? await hashPhoto(uri) : await sha256Text(`sample:${zoneId}:${stage}:${deviceTs}`);
    const p: Photo = { id: uid(), zoneId, stage, src, sample: !uri, hash, deviceTs, serverTs: deviceTs + 300, defects: mockDetect(zoneId, stage) };
    setPhotos((l) => [...l, p]);
    const zoneName = zones.find((z) => z.id === zoneId)?.name ?? '';
    log(`${zoneName} 촬영`, p.defects.length ? `하자 ${p.defects.length}건` : STAGE_LABEL[stage]);
    const next = await chainNext(chains[stage], hash);
    setChains((c) => ({ ...c, [stage]: next }));
    return p;
  }, [chains, zones, log]);

  const updateDefects = useCallback((photoId: string, defects: Defect[]) => setPhotos((l) => l.map((p) => (p.id === photoId ? { ...p, defects } : p))), []);

  const addZone = useCallback((name: string) => {
    const z = { id: uid(), name, tip: `${name}의 상태가 잘 보이게 찍어 주세요` };
    setZones((l) => [...l, z]);
    return z;
  }, []);

  const sendConfirm = useCallback((channel: string) => {
    setConfirm({ status: 'sent', channel });
    log('확인 요청 발송', channel);
    notify({ icon: 'check-circle', tone: 'accent', title: `${channel}${euro(channel)} 확인 요청을 보냈어요`, body: '응답이 없어도 발송 기록이 증빙으로 남아요' });
  }, [log, notify]);

  const landlordView = useCallback(() => setConfirm((c) => {
    if (c.status !== 'sent') return c;
    notify({ icon: 'eye', tone: 'accent', title: '임대인이 확인서를 열어 봤어요', body: '열람 기록이 증빙으로 저장됐어요' });
    return { ...c, status: 'viewed' };
  }), [notify]);

  const landlordRespond = useCallback((ok: boolean, signer: string, comment?: string) => {
    setConfirm((c) => ({ ...c, status: ok ? 'signed' : 'objected', signer, comment }));
    log(ok ? '임대인 확인 완료' : '임대인 이의', ok ? `${signer} 서명 · 기록 잠금` : comment);
    notify(ok
      ? { icon: 'check-circle', tone: 'ok', title: `${signer} 님이 확인했어요`, body: '입주 기록이 잠겨 퇴거 비교의 기준점이 됐어요' }
      : { icon: 'alert-triangle', tone: 'red', title: '임대인이 이의를 남겼어요', body: comment || '항목을 고쳐 다시 보낼 수 있어요' });
  }, [log, notify]);

  const addDefectReport = useCallback((r: Omit<DefectReport, 'id' | 'time'>) => {
    setDefectReports((l) => [{ ...r, id: uid(), time: Date.now() }, ...l]);
    log(`${r.place} 하자 신고`, r.category);
    notify({ icon: 'alert-triangle', tone: 'muted', title: `${r.place} 하자 신고가 저장됐어요`, body: r.repair ? '수리 요청을 함께 보냈어요' : '거주 중 기록으로 남겼어요' });
  }, [log, notify]);

  const addLease = useCallback((l: Omit<Lease, 'id' | 'current'>) => {
    setLeases((ls) => [{ ...l, id: uid(), current: true }, ...ls.map((x) => ({ ...x, current: false }))]);
    log('집 등록', l.address);
  }, [log]);

  const switchLease = useCallback((id: string) => setLeases((ls) => ls.map((x) => ({ ...x, current: x.id === id }))), []);
  const pay = useCallback((key: string) => { setPaid((p) => ({ ...p, [key]: true })); log('리포트 결제', '9,900원'); }, [log]);
  const markAllRead = useCallback(() => setNotis((l) => l.map((n) => ({ ...n, unread: false }))), []);

  const photosOf = useCallback((stage: Stage, zoneId?: string) => photos.filter((p) => p.stage === stage && (!zoneId || p.zoneId === zoneId)), [photos]);
  const inDone = new Set(photos.filter((p) => p.stage === 'in').map((p) => p.zoneId)).size;

  return {
    zones, photos, chains, lease, leases, confirm, notis, activity, defectReports, paid, suggestionHidden, loggedIn,
    dDay: daysUntil(lease.end), inDone,
    setSuggestionHidden, setLoggedIn,
    addPhoto, updateDefects, addZone, sendConfirm, landlordView, landlordRespond, addDefectReport, addLease, switchLease, pay, markAllRead, photosOf,
  };
}

type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

export const CONFIRM_LABEL: Record<ConfirmStatus, string> = { none: '미발송', sent: '응답 대기', viewed: '열람함', signed: '확인 완료', objected: '이의 있음' };

export function fmtTime(t: number) {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}. ${p(d.getDate())}. ${p(d.getHours())}:${p(d.getMinutes())}`;
}
