import { Asset } from 'expo-asset';
import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, type ImageSourcePropType } from 'react-native';
import { chainNext, hashBytes, readBytes, ZERO_HASH } from './hash';
import * as db from './lib/db';
import { supabase } from './lib/supabase';

export type Stage = 'in' | 'live' | 'out';
export const STAGE_LABEL: Record<Stage, string> = { in: '입주', live: '거주 중', out: '퇴거' };
export type Defect = { id: string; label: string; x: number; y: number; w: number; h: number; source: 'ai' | 'user'; conf?: number };
export type Photo = {
  id: string; zoneId: string; stage: Stage; src: ImageSourcePropType; sample: boolean;
  hash: string; deviceTs: number; serverTs: number; defects: Defect[];
  /** where the initial tags came from: real model, demo mock, or AI unavailable (user tags by hand) */
  ai?: 'model' | 'mock' | 'none';
};
export type Zone = { id: string; name: string; tip: string };
export type ConfirmStatus = 'none' | 'sent' | 'viewed' | 'signed' | 'objected';
export type Confirm = { status: ConfirmStatus; channel?: string; signer?: string; comment?: string; token?: string };
export type Lease = { id: string; address: string; start: string; end: string; deposit: string; landlord: string; current: boolean };
export type Noti = { id: string; icon: 'eye' | 'file-text' | 'alert-triangle' | 'calendar' | 'check-circle'; tone: 'accent' | 'ok' | 'muted' | 'red'; title: string; body: string; time: number; unread: boolean };
export type Activity = { id: string; title: string; detail?: string; time: number };
export type DefectReport = { id: string; category: string; place: string; memo: string; repair: boolean; photoIds: string[]; time: number };
/** demo = in-memory sample data; remote = signed-in user, every write goes to Supabase first. */
export type Mode = 'demo' | 'remote';

/** Where the landlord page is served (web build). Override with EXPO_PUBLIC_WEB_URL once it is hosted. */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://jachwisillok.kr').replace(/\/$/, '');
export const landlordLink = (token: string) => `${WEB_URL}/c/${token}`;

/** 통상 손모 checklist for the move-out-only report (FR-20). wear = normal wear (no restoration duty). */
export const CHECKLIST: { id: string; label: string; wear: boolean }[] = [
  { id: 'fade', label: '벽지 변색·햇빛 바램', wear: true },
  { id: 'pin', label: '못 자국·압정 구멍', wear: true },
  { id: 'dent', label: '가구 눌림 자국', wear: true },
  { id: 'tear', label: '찢김·낙서', wear: false },
  { id: 'break', label: '깨짐·파손', wear: false },
  { id: 'mold', label: '곰팡이(환기 부족)', wear: false },
];

export const SAMPLE = { wall: require('../assets/img/sample-wall.jpg'), floor: require('../assets/img/sample-floor.jpg') };

/** Korean particle 으로/로: '로' after a vowel or ㄹ final consonant, '으로' otherwise. */
export function euro(word: string) {
  const c = word.trim().charCodeAt(word.trim().length - 1) - 0xac00;
  if (c < 0 || c > 11171) return '로';
  const jong = c % 28;
  return jong === 0 || jong === 8 ? '로' : '으로';
}

export const uid = () => Math.random().toString(36).slice(2, 10);
const STAGES: Stage[] = ['in', 'live', 'out'];
const fromDb = (t: db.DbStage): Stage => (t === 'move_in' ? 'in' : t === 'living' ? 'live' : 'out');
const won = (n: number | string) => String(n).replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0';
const checklistFromDiff = (diff: unknown): Record<string, boolean> => {
  if (!diff || typeof diff !== 'object' || Array.isArray(diff)) return {};
  const value = (diff as { checklist?: unknown }).checklist;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const allowed = new Set(CHECKLIST.map((item) => item.id));
  return Object.fromEntries(Object.entries(value).filter(([id, checked]) => allowed.has(id) && typeof checked === 'boolean'));
};

/** Mock AI tagging (FR-06), keyed by zone name so it works for server zones too. Deterministic so demos repeat. */
export function mockDetect(zoneName: string, stage: Stage): Defect[] {
  const table: Record<string, Omit<Defect, 'id' | 'source'>[]> = {
    벽지: [{ label: '곰팡이', x: 0.64, y: 0.18, w: 0.22, h: 0.26, conf: 92 }, ...(stage === 'out' ? [{ label: '찢김', x: 0.14, y: 0.5, w: 0.24, h: 0.3, conf: 87 }] : [])],
    바닥: [{ label: '스크래치', x: 0.2, y: 0.5, w: 0.32, h: 0.18, conf: 88 }],
    '욕실 실리콘': stage === 'out' ? [{ label: '곰팡이', x: 0.34, y: 0.52, w: 0.32, h: 0.18, conf: 81 }] : [],
  };
  return (table[zoneName] ?? []).map((d) => ({ ...d, id: uid(), source: 'ai' as const }));
}

// ---------------------------------------------------------------- demo seed
const DEMO_ZONES: Zone[] = db.DEFAULT_ZONES.map(([name, tip], i) => ({ id: ['entry', 'wall', 'floor', 'bath', 'window', 'appliance'][i], name, tip }));
const t0 = new Date('2026-10-14T15:02:00+09:00').getTime();
const SEED: [string, string, ImageSourcePropType, string][] = [
  ['entry', '현관', SAMPLE.floor, '54a88851a8b3b244dedf4387a8733ba74c9d0edd175e486dfa3c2ac290844c8f'],
  ['wall', '벽지', SAMPLE.wall, 'f75158f215852ad05d0b7e4fa729f8adba59c72514b4d985889e1f5509bf58e2'],
  ['floor', '바닥', SAMPLE.floor, '54a88851a8b3b244dedf4387a8733ba74c9d0edd175e486dfa3c2ac290844c8f'],
  ['bath', '욕실 실리콘', SAMPLE.wall, 'f75158f215852ad05d0b7e4fa729f8adba59c72514b4d985889e1f5509bf58e2'],
];
const demoPhotos = (): Photo[] => SEED.map(([zoneId, name, src, hash], i) => ({
  id: uid(), zoneId, stage: 'in', src, sample: true, hash,
  deviceTs: t0 + 400000 + i * 60000, serverTs: t0 + 400300 + i * 60000, defects: mockDetect(name, 'in'), ai: 'mock',
}));
const DEMO_LEASES: Lease[] = [
  { id: 'l1', address: '부산 금정구 장전동 ○○빌 302호', start: '2026-03-01', end: '2027-02-28', deposit: '5,000,000', landlord: '010-1234-5678', current: true },
  { id: 'l0', address: '부산 금정구 부곡동 △△원룸 201호', start: '2025-03-01', end: '2026-02-28', deposit: '3,000,000', landlord: '010-9876-5432', current: false },
];
const DEMO_CHAINS: Record<Stage, string> = { in: '312743ca13342353eacf3aa126cad99f25e0f5e3580d207457468fed6d91db63', live: ZERO_HASH, out: ZERO_HASH };
const EMPTY_LEASE: Lease = { id: '', address: '등록된 집이 없어요', start: '2026-01-01', end: '2026-01-02', deposit: '0', landlord: '', current: true };

function daysUntil(date: string) {
  return Math.ceil((new Date(date + 'T00:00:00+09:00').getTime() - Date.now()) / 86400000);
}

/** Bytes of a captured file uri, or of a bundled sample image (so samples are hashed and uploaded like real photos). */
export async function photoBytes(src: ImageSourcePropType, uri: string | null) {
  if (uri) return readBytes(uri);
  const asset = Asset.fromModule(src as number);
  await asset.downloadAsync();
  return readBytes(asset.localUri ?? asset.uri);
}

function useStoreValue() {
  const [mode, setMode] = useState<Mode>('demo');
  const [zones, setZones] = useState<Zone[]>(DEMO_ZONES);
  const [photos, setPhotos] = useState<Photo[]>(demoPhotos);
  const [chains, setChains] = useState<Record<Stage, string>>(DEMO_CHAINS);
  const [inspectionIds, setInspectionIds] = useState<Partial<Record<Stage, string>>>({});
  const [leases, setLeases] = useState<Lease[]>(DEMO_LEASES);
  const [confirm, setConfirm] = useState<Confirm>({ status: 'none' });
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
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const checklistLeaseId = useRef<string | null>(null);

  const lease = leases.find((l) => l.current) ?? EMPTY_LEASE;
  const remote = mode === 'remote';
  // Signed in: activity and notices are also stored (FR-11). A failed event write must not undo the action it describes.
  // Ids of events this device wrote, so the realtime echo of our own insert is not shown twice.
  const ownEvents = useRef(new Set<string>());
  const persist = useCallback((e: Parameters<typeof db.addEvent>[1]) => { if (remote && lease.id) db.addEvent(lease.id, e).catch(() => {}); }, [remote, lease.id]);
  const eventId = useCallback(() => { const id = remote ? Crypto.randomUUID() : uid(); ownEvents.current.add(id); return id; }, [remote]);
  const log = useCallback((title: string, detail?: string) => {
    const id = eventId();
    setActivity((a) => [{ id, title, detail, time: Date.now() }, ...a]);
    persist({ id, kind: 'activity', title, body: detail });
  }, [persist, eventId]);
  const notify = useCallback((n: Omit<Noti, 'id' | 'time' | 'unread'>) => {
    const id = eventId();
    setNotis((l) => [{ ...n, id, time: Date.now(), unread: true }, ...l]);
    persist({ id, kind: 'notice', icon: n.icon, tone: n.tone, title: n.title, body: n.body });
  }, [persist, eventId]);

  /** Replace local state with the server snapshot. Returns false when the user has no home yet. */
  const applySnapshot = useCallback((s: db.Snapshot | null) => {
    setMode('remote');
    if (!s) {
      setLeases([]); setZones([]); setPhotos([]); setChains({ in: ZERO_HASH, live: ZERO_HASH, out: ZERO_HASH }); setInspectionIds({});
      setConfirm({ status: 'none' }); setDefectReports([]); setPaid({}); setActivity([]); setNotis([]); setChecklist({}); checklistLeaseId.current = null;
      return false;
    }
    const cur = s.leases.find((l) => l.is_current) ?? s.leases[0];
    setLeases(s.leases.map((l) => ({ id: l.id, address: l.address, start: l.start_date, end: l.end_date, deposit: won(l.deposit), landlord: l.landlord_contact ?? '', current: l.id === cur.id })));
    setZones(s.zones.map((z) => ({ id: z.id, name: z.name, tip: z.tip ?? '' })));
    const stageOf = Object.fromEntries(s.inspections.map((i) => [i.id, fromDb(i.type)])) as Record<string, Stage>;
    setInspectionIds(Object.fromEntries(s.inspections.map((i) => [fromDb(i.type), i.id])));
    setChains({ in: ZERO_HASH, live: ZERO_HASH, out: ZERO_HASH, ...Object.fromEntries(s.inspections.map((i) => [fromDb(i.type), i.chain_hash])) });
    setPhotos(s.photos.map((p) => ({
      id: p.id, zoneId: p.zone_id, stage: stageOf[p.inspection_id], src: p.url ? { uri: p.url } : SAMPLE.wall, sample: false, hash: p.sha256,
      deviceTs: p.device_ts ? new Date(p.device_ts).getTime() : new Date(p.server_ts).getTime(), serverTs: new Date(p.server_ts).getTime(),
      defects: p.defects.map((d) => ({ id: d.id, label: d.label, ...d.bbox, source: d.source, conf: d.confidence ?? undefined })),
    })));
    const c = s.confirmation;
    setConfirm(c ? { status: c.status, channel: c.channel ?? undefined, signer: c.signer_name ?? undefined, comment: c.comment ?? undefined, token: c.token } : { status: 'none' });
    setDefectReports(s.defectReports.map((r) => ({ id: r.id, category: r.category, place: r.place, memo: r.memo ?? '', repair: r.repair_requested, photoIds: r.photo_ids ?? [], time: new Date(r.created_at).getTime() })));
    setPaid(Object.fromEntries(s.reports.filter((r) => r.status !== 'pending').map((r) => [r.type === 'compare' ? 'compare' : 'only', true])));
    if (checklistLeaseId.current !== cur.id) {
      const latestOnlyReport = s.reports.find((r) => r.type === 'move_out_only' && r.status !== 'pending');
      setChecklist(checklistFromDiff(latestOnlyReport?.diff));
      checklistLeaseId.current = cur.id;
    }
    const ev = s.events.map((e) => ({ e, time: new Date(e.created_at).getTime() }));
    setActivity(ev.filter(({ e }) => e.kind === 'activity').map(({ e, time }) => ({ id: e.id, title: e.title, detail: e.body ?? undefined, time })));
    setNotis(ev.filter(({ e }) => e.kind === 'notice').map(({ e, time }) => ({ id: e.id, icon: (e.icon ?? 'check-circle') as Noti['icon'], tone: (e.tone ?? 'accent') as Noti['tone'], title: e.title, body: e.body ?? '', time, unread: !e.read_at })));
    return true;
  }, []);

  const loadedAt = useRef(0);
  const connect = useCallback(async () => { const s = await db.loadSnapshot(); loadedAt.current = Date.now(); setLoggedIn(true); return applySnapshot(s); }, [applySnapshot]);
  const refresh = useCallback(async () => { const s = await db.loadSnapshot(); loadedAt.current = Date.now(); return applySnapshot(s); }, [applySnapshot]);

  // Photo URLs are signed for 1 hour; re-sign them when the app comes back after they would have expired.
  useEffect(() => {
    if (mode !== 'remote') return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && Date.now() - loadedAt.current > 50 * 60 * 1000) refresh().catch(() => {});
    });
    return () => sub.remove();
  }, [mode, refresh]);

  // Live notices (landlord viewed / signed / objected) while the app is open. RLS limits the stream to this tenant.
  const [toast, setToast] = useState<{ id: string; title: string; body: string } | null>(null);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    if (mode !== 'remote' || !lease.id) return;
    const ch = supabase.channel(`events:${lease.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events', filter: `lease_id=eq.${lease.id}` }, (payload) => {
        const e = payload.new as db.EventRow;
        if (e.kind !== 'notice' || ownEvents.current.has(e.id)) return;
        ownEvents.current.add(e.id);
        setNotis((l) => [{ id: e.id, icon: (e.icon ?? 'check-circle') as Noti['icon'], tone: (e.tone ?? 'accent') as Noti['tone'], title: e.title, body: e.body ?? '', time: new Date(e.created_at).getTime(), unread: true }, ...l]);
        setToast({ id: e.id, title: e.title, body: e.body ?? '' });
        refreshRef.current().catch(() => {}); // pick up the new confirmation status
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [mode, lease.id]);
  const resetDemo = useCallback(() => {
    checklistLeaseId.current = null;
    setMode('demo'); setZones(DEMO_ZONES); setPhotos(demoPhotos()); setChains(DEMO_CHAINS); setLeases(DEMO_LEASES); setInspectionIds({});
    setConfirm({ status: 'none' }); setDefectReports([]); setPaid({}); setChecklist({}); setSuggestionHidden(false); setToast(null);
    setNotis([
      { id: 'n1', icon: 'file-text', tone: 'ok', title: '입주 확인서가 준비됐어요', body: '지금 보내거나 나중에 보낼 수 있어요', time: t0 + 600000, unread: true },
      { id: 'n2', icon: 'calendar', tone: 'muted', title: '계약 만료까지 남은 기간을 알려 드려요', body: '퇴거 30일 전에 다시 알려 드려요', time: t0, unread: false },
    ]);
    setActivity([
      { id: 'a2', title: '바닥 촬영', detail: '하자 1건', time: t0 + 520000 },
      { id: 'a1', title: '벽지 촬영', detail: '하자 1건', time: t0 + 460000 },
      { id: 'a0', title: '집 등록', time: t0 },
    ]);
  }, []);

  /** Lock a captured photo: hash the original bytes, then (signed in) upload once and let the server stamp time + extend the chain. */
  const addPhoto = useCallback(async (zoneId: string, stage: Stage, src: ImageSourcePropType, uri: string | null) => {
    const zoneName = zones.find((z) => z.id === zoneId)?.name ?? '';
    const deviceTs = Date.now();
    const bytes = await photoBytes(src, uri);
    const hash = await hashBytes(bytes);
    const id = remote ? Crypto.randomUUID() : uid();
    let defects = remote ? [] : mockDetect(zoneName, stage);
    let ai: Photo['ai'] = remote ? 'none' : 'mock';
    let serverTs = deviceTs + 300;
    let chain: string;
    if (remote) {
      const insId = inspectionIds[stage];
      if (!insId) throw new Error('점검 정보를 찾을 수 없어요. 다시 로그인해 주세요.');
      let key: string;
      ({ serverTs, chain, key } = await db.uploadPhoto({ id, inspectionId: insId, zoneId, bytes, sha256: hash, deviceTs }));
      // The original is already locked; AI tagging is best-effort and never blocks or fakes the record.
      try {
        defects = (await db.aiDetect(key, zoneName, STAGE_LABEL[stage])).map((d) => ({ id: uid(), label: d.label, x: d.x, y: d.y, w: d.w, h: d.h, source: 'ai' as const, conf: d.confidence }));
        ai = 'model';
        await db.replaceDefects(id, defects);
      } catch { ai = 'none'; defects = []; } // never show tags the server did not keep
    } else {
      chain = await chainNext(chains[stage], hash);
    }
    const p: Photo = { id, zoneId, stage, src, sample: !uri, hash, deviceTs, serverTs, defects, ai };
    setPhotos((l) => [...l, p]);
    setChains((c) => ({ ...c, [stage]: chain }));
    log(`${zoneName} 촬영`, defects.length ? `하자 ${defects.length}건` : STAGE_LABEL[stage]);
    return p;
  }, [zones, remote, inspectionIds, chains, log]);

  const updateDefects = useCallback(async (photoId: string, defects: Defect[]) => {
    if (remote) await db.replaceDefects(photoId, defects);
    setPhotos((l) => l.map((p) => (p.id === photoId ? { ...p, defects } : p)));
  }, [remote]);

  const addZone = useCallback(async (name: string): Promise<Zone> => {
    const z = remote
      ? await db.createZone(lease.id, name, zones.length).then((r) => ({ id: r.id, name: r.name, tip: r.tip ?? '' }))
      : { id: uid(), name, tip: `${name}의 상태가 잘 보이게 찍어 주세요` };
    setZones((l) => [...l, z]);
    return z;
  }, [remote, lease.id, zones.length]);

  /** Creates the landlord link (token + time-limited photo URLs) and returns it so the caller can actually send it. */
  const sendConfirm = useCallback(async (channel: string) => {
    let link = landlordLink('demo');
    if (remote) {
      if (!inspectionIds.in) throw new Error('입주 점검 정보를 찾을 수 없어요.');
      const ids = photos.filter((p) => p.stage === 'in').map((p) => p.id);
      const c = await db.createConfirmation(inspectionIds.in, channel, ids);
      setConfirm({ status: 'sent', channel, token: c.token });
      link = landlordLink(c.token);
    } else setConfirm({ status: 'sent', channel });
    log('확인 요청 발송', channel);
    notify({ icon: 'check-circle', tone: 'accent', title: `${channel}${euro(channel)} 확인 요청을 보냈어요`, body: '응답이 없어도 발송 기록이 증빙으로 남아요' });
    return link;
  }, [remote, inspectionIds.in, photos, log, notify]);

  /** Demo-mode landlord simulation. Signed-in users go through /c/[token], where the server records everything. */
  const landlordView = useCallback(async () => {
    if (confirm.status !== 'sent') return;
    setConfirm((c) => ({ ...c, status: 'viewed' }));
    notify({ icon: 'eye', tone: 'accent', title: '임대인이 확인서를 열어 봤어요', body: '열람 기록이 증빙으로 저장됐어요' });
  }, [confirm.status, notify]);

  const landlordRespond = useCallback(async (okv: boolean, signer: string, comment?: string) => {
    if (confirm.status !== 'sent' && confirm.status !== 'viewed') throw new Error('먼저 임대인 확인 요청을 보내 주세요.');
    setConfirm((c) => ({ ...c, status: okv ? 'signed' : 'objected', signer, comment }));
    log(okv ? '임대인 확인 완료' : '임대인 이의', okv ? `${signer} 서명 · 기록 잠금` : comment);
    notify(okv
      ? { icon: 'check-circle', tone: 'ok', title: `${signer} 님이 확인했어요`, body: '입주 기록이 잠겨 퇴거 비교의 기준점이 됐어요' }
      : { icon: 'alert-triangle', tone: 'red', title: '임대인이 이의를 남겼어요', body: comment || '항목을 고쳐 다시 보낼 수 있어요' });
  }, [confirm.status, log, notify]);

  const addDefectReport = useCallback(async (r: Omit<DefectReport, 'id' | 'time'>) => {
    if (remote) await db.createDefectReport(lease.id, r);
    setDefectReports((l) => [{ ...r, id: uid(), time: Date.now() }, ...l]);
    log(`${r.place} 하자 신고`, r.category);
    notify({ icon: 'alert-triangle', tone: 'muted', title: `${r.place} 하자 신고가 저장됐어요`, body: r.repair ? '수리 요청 의사도 기록했어요' : '거주 중 기록으로 남겼어요' });
  }, [remote, lease.id, log, notify]);

  const addLease = useCallback(async (l: Omit<Lease, 'id' | 'current'>) => {
    if (remote) {
      await db.createLease({ address: l.address, start: l.start, end: l.end, deposit: Number(l.deposit.replace(/[^\d]/g, '')) || 0, landlord: l.landlord });
      await refresh();
    } else {
      setLeases((ls) => [{ ...l, id: uid(), current: true }, ...ls.map((x) => ({ ...x, current: false }))]);
    }
    log('집 등록', l.address);
  }, [remote, refresh, log]);

  const switchLease = useCallback(async (id: string) => {
    if (remote) { await db.setCurrentLease(id); await refresh(); return; }
    setLeases((ls) => ls.map((x) => ({ ...x, current: x.id === id })));
  }, [remote, refresh]);

  const pay = useCallback(async (key: 'compare' | 'only') => {
    if (remote) await db.createPendingReport(lease.id, key === 'compare' ? 'compare' : 'move_out_only', key === 'compare' ? inspectionIds.in : undefined, inspectionIds.out, key === 'only' ? { checklist } : undefined);
    setPaid((p) => ({ ...p, [key]: true }));
    log('리포트 결제', '9,900원');
  }, [remote, lease.id, inspectionIds, checklist, log]);

  const markAllRead = useCallback(() => {
    setNotis((l) => l.map((n) => ({ ...n, unread: false })));
    if (remote && lease.id) db.markEventsRead(lease.id).catch(() => {});
  }, [remote, lease.id]);

  const updateLease = useCallback(async (l: Omit<Lease, 'id' | 'current'>) => {
    if (remote) { await db.updateLease(lease.id, { ...l, deposit: Number(l.deposit.replace(/[^\d]/g, '')) || 0 }); await refresh(); }
    else setLeases((ls) => ls.map((x) => (x.current ? { ...x, ...l } : x)));
  }, [remote, lease.id, refresh]);

  /** FR-18: is this SHA-256 a registered original? Signed in -> server registry; demo -> local photos. */
  const verify = useCallback(async (sha: string): Promise<db.VerifyResult> => {
    const h = sha.trim().toLowerCase();
    if (remote) return db.verifyHash(h);
    const p = photos.find((x) => x.hash === h);
    if (!p) return { found: false };
    return { found: true, server_ts: new Date(p.serverTs).toISOString(), zone: zones.find((z) => z.id === p.zoneId)?.name ?? '', stage: db.STAGE_DB[p.stage], confirmed: p.stage === 'in' && confirm.status === 'signed' };
  }, [remote, photos, zones, confirm.status]);
  const photosOf = useCallback((stage: Stage, zoneId?: string) => photos.filter((p) => p.stage === stage && (!zoneId || p.zoneId === zoneId)), [photos]);
  const inDone = new Set(photos.filter((p) => p.stage === 'in').map((p) => p.zoneId)).size;
  const hasLease = leases.length > 0;

  return {
    mode, zones, photos, chains, lease, leases, hasLease, confirm, notis, activity, defectReports, paid, suggestionHidden, loggedIn,
    dDay: daysUntil(lease.end), inDone, stages: STAGES,
    checklist, setChecklist, toast, setToast,
    setSuggestionHidden, setLoggedIn, connect, refresh, resetDemo, updateLease, verify,
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

/** Turn any thrown value into a message a user can act on. */
export const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
