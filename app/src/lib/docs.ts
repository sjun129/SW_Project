import { CHECKLIST, CONFIRM_LABEL, fmtTime, photoBytes, STAGE_LABEL, type Confirm, type Lease, type Photo, type Stage, type Zone } from '../store';
import { imgSrc, type PdfDoc, type PdfPhoto } from './pdf';

type Data = { lease: Lease; zones: Zone[]; photos: Photo[]; chains: Record<Stage, string>; confirm: Confirm; checklist: Record<string, boolean> };

const stamp = (t: number) => new Date(t).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
const docNo = (prefix: string, lease: Lease) => `No. ${prefix}-${lease.start.replace(/-/g, '')}-${(lease.id || 'demo').slice(0, 6).toUpperCase()}`;

async function rows(d: Data, stages: Stage[], onlyChanged = false): Promise<PdfPhoto[]> {
  const out: PdfPhoto[] = [];
  for (const z of d.zones) {
    for (const st of stages) {
      const p = d.photos.filter((x) => x.zoneId === z.id && x.stage === st).at(-1);
      if (!p) continue;
      const before = st === 'out' ? d.photos.filter((x) => x.zoneId === z.id && x.stage === 'in').at(-1) : undefined;
      const fresh = before ? p.defects.filter((x) => !before.defects.some((o) => o.label === x.label && Math.abs(o.x - x.x) < 0.05)) : p.defects;
      if (onlyChanged && st === 'out' && !fresh.length) continue;
      out.push({
        zone: z.name, stage: STAGE_LABEL[st], img: await imgSrc(p.src, photoBytes), hash: p.hash, serverTs: stamp(p.serverTs),
        defects: (st === 'out' ? fresh : p.defects).map((x) => x.label), note: st === 'out' && before ? '입주 대비 새로 생긴 항목' : undefined,
      });
    }
  }
  return out;
}

/** FR-08 입주 상태 확인서 */
export async function buildCertificate(d: Data): Promise<PdfDoc> {
  const ps = d.photos.filter((p) => p.stage === 'in');
  return {
    title: '입주 상태 확인서', docNo: docNo('JS', d.lease),
    meta: [
      ['주소', d.lease.address], ['계약 기간', `${d.lease.start} ~ ${d.lease.end}`], ['보증금', `${d.lease.deposit}원`],
      ['기록일', ps[0] ? fmtTime(ps[0].serverTs) : '—'], ['사진 · 하자', `${ps.length}장 · ${ps.reduce((n, p) => n + p.defects.length, 0)}건`],
      ['임대인 확인', `${CONFIRM_LABEL[d.confirm.status]}${d.confirm.signer ? ` (${d.confirm.signer})` : ''}`], ['chain_hash', d.chains.in],
    ],
    photos: await rows(d, ['in']),
  };
}

/** FR-17 비교 리포트 / FR-20 퇴거 단독 리포트 */
export async function buildReport(d: Data, key: 'compare' | 'only'): Promise<PdfDoc> {
  const base: [string, string][] = [['주소', d.lease.address], ['계약 기간', `${d.lease.start} ~ ${d.lease.end}`], ['발급', stamp(Date.now())]];
  if (key === 'only') {
    return {
      title: '퇴거 단독 리포트', docNo: docNo('JSO', d.lease),
      meta: [...base, ['퇴거 chain_hash', d.chains.out]],
      checklist: CHECKLIST.map((c) => [c.label, d.checklist[c.id] ? `있음 · ${c.wear ? '통상 손모(원상복구 대상 아님 · 참고)' : '임차인 과실 의심(참고)'}` : '없음']),
      photos: await rows(d, ['out']),
    };
  }
  return {
    title: '퇴거 비교 리포트', docNo: docNo('JSC', d.lease),
    meta: [...base, ['입주 chain_hash', d.chains.in], ['퇴거 chain_hash', d.chains.out], ['임대인 확인', CONFIRM_LABEL[d.confirm.status]]],
    photos: await rows(d, ['in', 'out'], true),
    footer: '퇴거 사진에는 입주 기록에 없던 항목만 표시했습니다.',
  };
}
