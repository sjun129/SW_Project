import { supabase } from './supabase';

/** Server-side stage names (inspections.type). */
export const STAGE_DB = { in: 'move_in', live: 'living', out: 'move_out' } as const;
export type DbStage = (typeof STAGE_DB)[keyof typeof STAGE_DB];

export type LeaseRow = { id: string; address: string; start_date: string; end_date: string; deposit: number; landlord_contact: string | null; is_current: boolean };
export type ZoneRow = { id: string; name: string; tip: string | null; sort: number };
export type InspectionRow = { id: string; type: DbStage; chain_hash: string };
export type DefectRow = { id: string; photo_id: string; label: string; bbox: { x: number; y: number; w: number; h: number }; source: 'ai' | 'user'; confidence: number | null };
export type PhotoRow = { id: string; inspection_id: string; zone_id: string; storage_key: string; sha256: string; prev_hash: string; device_ts: string | null; server_ts: string; defects: DefectRow[] };
export type ConfirmationRow = { id: string; token: string; channel: string | null; status: 'sent' | 'viewed' | 'signed' | 'objected'; signer_name: string | null; comment: string | null; sent_at: string };
export type DefectReportRow = { id: string; category: string; place: string; memo: string | null; repair_requested: boolean; photo_ids: string[]; created_at: string };
export type ReportRow = { id: string; type: 'compare' | 'move_out_only'; status: 'pending' | 'paid' | 'issued'; diff: unknown; created_at: string };
export type EventRow = { id: string; kind: 'activity' | 'notice'; icon: string | null; tone: string | null; title: string; body: string | null; read_at: string | null; created_at: string };

export const DEFAULT_ZONES: [string, string][] = [
  ['현관', '바닥 타일과 현관문 하단이 함께 보이게 찍어 주세요'],
  ['벽지', '창가 쪽 벽 모서리를 위주로, 곰팡이·들뜸을 가까이서'],
  ['바닥', '침대·책상 자리 바닥의 찍힘과 스크래치를 비스듬히'],
  ['욕실 실리콘', '세면대·욕조 실리콘 줄눈이 화면 가운데 오게'],
  ['창틀', '레일과 방충망 모서리를 함께 담아 주세요'],
  ['옵션 가전', '냉장고·세탁기 문을 연 상태로 내부까지'],
];

/** Throw on any Supabase error so callers can show one message instead of silently diverging from the server. */
function ok<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export type Snapshot = {
  leases: LeaseRow[]; zones: ZoneRow[]; inspections: InspectionRow[]; photos: (PhotoRow & { url: string | null })[];
  confirmation: ConfirmationRow | null; defectReports: DefectReportRow[]; reports: ReportRow[]; events: EventRow[];
};

/** Everything the app needs for the current lease, or null when the user has not registered a home yet. */
export async function loadSnapshot(): Promise<Snapshot | null> {
  const leases = ok(await supabase.from('leases').select('id,address,start_date,end_date,deposit,landlord_contact,is_current').order('created_at', { ascending: false })) as LeaseRow[];
  const lease = leases.find((l) => l.is_current) ?? leases[0];
  if (!lease) return null;
  const [z, ins, dr, rp, ev] = await Promise.all([
    supabase.from('zones').select('id,name,tip,sort').eq('lease_id', lease.id).order('sort'),
    supabase.from('inspections').select('id,type,chain_hash').eq('lease_id', lease.id),
    supabase.from('defect_reports').select('id,category,place,memo,repair_requested,photo_ids,created_at').eq('lease_id', lease.id).order('created_at', { ascending: false }),
    supabase.from('reports').select('id,type,status,diff,created_at').eq('lease_id', lease.id).order('created_at', { ascending: false }),
    supabase.from('events').select('id,kind,icon,tone,title,body,read_at,created_at').eq('lease_id', lease.id).order('created_at', { ascending: false }).limit(100),
  ]);
  const zones = ok(z) as ZoneRow[], inspections = ok(ins) as InspectionRow[], defectReports = ok(dr) as DefectReportRow[], reports = ok(rp) as ReportRow[], events = ok(ev) as EventRow[];
  const insIds = inspections.map((i) => i.id);
  const photos = insIds.length
    ? ok(await supabase.from('photos').select('id,inspection_id,zone_id,storage_key,sha256,prev_hash,device_ts,server_ts,defects(id,photo_id,label,bbox,source,confidence)').in('inspection_id', insIds).order('server_ts')) as PhotoRow[]
    : [];
  const signed = photos.length ? ok(await supabase.storage.from('originals').createSignedUrls(photos.map((p) => p.storage_key), 60 * 60)) : [];
  const moveIn = inspections.find((i) => i.type === 'move_in');
  const conf = moveIn
    ? ok(await supabase.from('confirmations').select('id,token,channel,status,signer_name,comment,sent_at').eq('inspection_id', moveIn.id).order('sent_at', { ascending: false }).limit(1)) as ConfirmationRow[]
    : [];
  return {
    leases, zones, inspections, defectReports, reports, events, confirmation: conf[0] ?? null,
    photos: photos.map((p, i) => ({ ...p, url: signed[i]?.signedUrl ?? null })),
  };
}

/** New home: lease + default zones + one inspection per stage. Previous homes stay but stop being current. */
export async function createLease(l: { address: string; start: string; end: string; deposit: number; landlord: string }) {
  const uidv = await currentUserId();
  if (!uidv) throw new Error('로그인이 필요해요.');
  return ok(await supabase.rpc('create_lease_with_defaults', {
    p_address: l.address, p_start: l.start, p_end: l.end, p_deposit: l.deposit, p_landlord: l.landlord || '',
  })) as string;
}

export async function setCurrentLease(id: string) {
  if (!(await currentUserId())) throw new Error('로그인이 필요해요.');
  ok(await supabase.rpc('set_current_lease', { p_lease: id }));
}

export async function createZone(leaseId: string, name: string, sort: number) {
  return ok(await supabase.from('zones').insert({ lease_id: leaseId, name, tip: `${name}의 상태가 잘 보이게 찍어 주세요`, sort }).select('id,name,tip,sort').single()) as ZoneRow;
}

/** Upload the original once (bucket has no update/delete policy), then register it; the server trigger stamps server_ts and extends the chain. */
export async function uploadPhoto(p: { id: string; inspectionId: string; zoneId: string; bytes: Uint8Array<ArrayBuffer>; sha256: string; deviceTs: number }) {
  const uidv = await currentUserId();
  if (!uidv) throw new Error('로그인이 필요해요.');
  const key = `${uidv}/${p.inspectionId}/${p.id}.jpg`;
  ok(await supabase.storage.from('originals').upload(key, p.bytes, { contentType: 'image/jpeg', upsert: false }));
  const row = ok(await supabase.from('photos').insert({
    id: p.id, inspection_id: p.inspectionId, zone_id: p.zoneId, storage_key: key, sha256: p.sha256,
    prev_hash: '0'.repeat(64), device_ts: new Date(p.deviceTs).toISOString(),
  }).select('server_ts,prev_hash').single()) as { server_ts: string; prev_hash: string };
  const ins = ok(await supabase.from('inspections').select('chain_hash').eq('id', p.inspectionId).single()) as { chain_hash: string };
  return { serverTs: new Date(row.server_ts).getTime(), chain: ins.chain_hash, key };
}

export async function replaceDefects(photoId: string, defects: { label: string; x: number; y: number; w: number; h: number; source: 'ai' | 'user'; conf?: number }[]) {
  ok(await supabase.rpc('replace_photo_defects', {
    p_photo: photoId,
    p_defects: defects.map(({ label, x, y, w, h, source, conf }) => ({ label, x, y, w, h, source, conf: conf ?? null })),
  }));
}

/** Storage path is deterministic, so it can be rebuilt from ids without another query. */
export const storageKey = (userId: string, inspectionId: string, photoId: string) => `${userId}/${inspectionId}/${photoId}.jpg`;

const LINK_DAYS = 7;

/** Signed URLs live exactly as long as the landlord link (NFR-03), so the private bucket is never opened up. */
export async function createConfirmation(inspectionId: string, channel: string, photoIds: string[]) {
  const uidv = await currentUserId();
  if (!uidv) throw new Error('로그인이 필요해요.');
  const signed = photoIds.length
    ? ok(await supabase.storage.from('originals').createSignedUrls(photoIds.map((id) => storageKey(uidv, inspectionId, id)), LINK_DAYS * 86400))
    : [];
  const photo_urls = Object.fromEntries(photoIds.map((id, i) => [id, signed[i]?.signedUrl ?? null]).filter(([, u]) => u));
  return ok(await supabase.from('confirmations').insert({ inspection_id: inspectionId, channel, photo_urls }).select('id,token,channel,status,signer_name,comment,sent_at').single()) as ConfirmationRow;
}

export type LandlordPhoto = { id: string; zone: string; url: string | null; server_ts: string; sha256: string; defects: { label: string; bbox: { x: number; y: number; w: number; h: number } }[] };
/** preview = the signed-in tenant opened their own link: read-only, not counted as a landlord view. */
export type LandlordData = { address: string; status: 'sent' | 'viewed' | 'signed' | 'objected'; signer: string | null; expires_at: string; preview?: boolean; photos: LandlordPhoto[] };

export type VerifyResult = { found: false } | { found: true; server_ts: string; zone: string; stage: DbStage; confirmed: boolean };
export const verifyHash = async (sha: string) => ok(await supabase.rpc('verify_hash', { p_sha256: sha })) as VerifyResult;

export async function addEvent(leaseId: string, e: { id?: string; kind: 'activity' | 'notice'; icon?: string; tone?: string; title: string; body?: string }) {
  ok(await supabase.from('events').insert({ ...(e.id ? { id: e.id } : {}), lease_id: leaseId, kind: e.kind, icon: e.icon ?? null, tone: e.tone ?? null, title: e.title, body: e.body ?? null }));
}
export async function markEventsRead(leaseId: string) {
  ok(await supabase.from('events').update({ read_at: new Date().toISOString() }).eq('lease_id', leaseId).is('read_at', null));
}

export async function updateLease(id: string, l: { address: string; start: string; end: string; deposit: number; landlord: string }) {
  ok(await supabase.from('leases').update({ address: l.address, start_date: l.start, end_date: l.end, deposit: l.deposit, landlord_contact: l.landlord || null }).eq('id', id));
}

export const landlordView = async (token: string) => ok(await supabase.rpc('landlord_view', { p_token: token })) as LandlordData;
export const landlordRespond = async (token: string, okv: boolean, signer: string, comment?: string) =>
  ok(await supabase.rpc('landlord_respond', { p_token: token, p_ok: okv, p_signer: signer, p_comment: comment ?? null }));

export async function createDefectReport(leaseId: string, r: { category: string; place: string; memo: string; repair: boolean; photoIds: string[] }) {
  ok(await supabase.from('defect_reports').insert({ lease_id: leaseId, category: r.category, place: r.place, memo: r.memo || null, repair_requested: r.repair, photo_ids: r.photoIds }));
}

/** Mock checkout only creates a pending report. A trusted PG webhook must record payment and issue it. */
export async function createPendingReport(leaseId: string, type: 'compare' | 'move_out_only', moveInId?: string, moveOutId?: string, diff?: unknown) {
  ok(await supabase.from('reports').insert({ lease_id: leaseId, type, status: 'pending', move_in_id: moveInId ?? null, move_out_id: moveOutId ?? null, diff: diff ?? null }));
}

// ---------------------------------------------------------------- AI (Edge Function `vision`, OpenAI)
export type AiDefect = { label: string; x: number; y: number; w: number; h: number; confidence: number };

async function vision<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('vision', { body });
  if (error) {
    // FunctionsHttpError carries the JSON body the function returned
    const detail = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(detail?.error ?? error.message);
  }
  return data as T;
}

/** FR-06: vision tagging of an uploaded original. Throws when the function is not deployed or the model fails. */
export const aiDetect = async (storageKeyPath: string, zone: string, stage: string) =>
  (await vision<{ defects: AiDefect[] }>({ task: 'defects', storage_key: storageKeyPath, zone, stage })).defects;

export type LeaseGuess = { address: string; start_date: string; end_date: string; deposit: number; landlord_phone: string };
/** Reads a lease contract photo (base64 data URL) into form values. */
export const extractLease = async (dataUrl: string) => (await vision<{ lease: LeaseGuess }>({ task: 'lease', image: dataUrl })).lease;
