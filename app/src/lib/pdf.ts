import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, type ImageSourcePropType } from 'react-native';
import { LEGAL } from '../theme';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function b64(bytes: Uint8Array) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Remote photos keep their signed https URL; bundled samples and local captures are inlined so the PDF is self-contained. */
export async function imgSrc(src: ImageSourcePropType, read: (src: ImageSourcePropType, uri: string | null) => Promise<Uint8Array>) {
  const uri = typeof src === 'object' && src && 'uri' in src ? src.uri ?? null : null;
  if (uri?.startsWith('http')) return uri;
  try { return `data:image/jpeg;base64,${b64(await read(src, uri))}`; } catch { return null; }
}

export type PdfPhoto = { zone: string; stage: string; img: string | null; hash: string; serverTs: string; defects: string[]; note?: string };
export type PdfDoc = { title: string; docNo: string; meta: [string, string][]; photos: PdfPhoto[]; checklist?: [string, string][]; body?: string; footer?: string; showPhotos?: boolean };

export function renderHtml(d: PdfDoc) {
  const rows = d.photos.map((p) => `
    <div class="row">
      ${p.img ? `<img src="${p.img}"/>` : '<div class="noimg">사진</div>'}
      <div class="info">
        <b>${esc(p.zone)}</b> <span class="muted">· ${esc(p.stage)}</span>
        <div class="${p.defects.length ? 'red' : 'muted'}">${p.defects.length ? esc(p.defects.join(', ')) : '하자 없음'}${p.note ? ` · ${esc(p.note)}` : ''}</div>
        <div class="mono">SHA-256 ${p.hash}</div>
        <div class="mono">서버 확인 ${esc(p.serverTs)}</div>
      </div>
    </div>`).join('');
  const checklist = d.checklist?.length
    ? `<h2>통상 손모 체크리스트</h2><table>${d.checklist.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    body{font-family:-apple-system,'Noto Sans KR','Apple SD Gothic Neo',sans-serif;color:#1F2633;padding:28px;font-size:12px}
    h1{font-size:22px;margin:4px 0 14px} h2{font-size:14px;margin:20px 0 8px}
    .top{display:flex;justify-content:space-between;color:#7B8494;font-size:11px}
    .brand{font-weight:900;color:#E2A236;font-size:16px}.brand b{color:#293750}
    table{border-collapse:collapse;width:100%} td{border-bottom:1px solid #E3E7EE;padding:6px 4px;vertical-align:top} td:first-child{color:#7B8494;width:110px}
    .row{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #E3E7EE;page-break-inside:avoid}
    .row img,.noimg{width:150px;height:112px;object-fit:cover;border-radius:6px;background:#2F3542;color:#fff;display:flex;align-items:center;justify-content:center}
    .info{flex:1;display:flex;flex-direction:column;gap:3px}.muted{color:#7B8494}.red{color:#C33B49}
    .mono{font-family:Menlo,Consolas,monospace;font-size:9.5px;color:#7B8494;word-break:break-all}
    .body{margin:18px 0;line-height:1.8;white-space:pre-wrap}
    .legal{margin-top:18px;border:1px solid #E3E7EE;border-radius:8px;padding:8px;color:#7B8494;font-size:10.5px}
  </style></head><body>
    <div class="top"><span class="brand">자취<b>실록</b></span><span>${esc(d.docNo)}</span></div>
    <h1>${esc(d.title)}</h1>
    <table>${d.meta.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="${k.includes('hash') ? 'mono' : ''}">${esc(v)}</td></tr>`).join('')}</table>
    ${checklist}
    ${d.body ? `<div class="body">${esc(d.body).replace(/\n/g, '<br/>')}</div>` : ''}
    ${d.showPhotos === false ? '' : `<h2>구역별 기록</h2>${rows || '<p class="muted">기록된 사진이 없어요.</p>'}`}
    ${d.footer ? `<p class="muted">${esc(d.footer)}</p>` : ''}
    <div class="legal">${esc(LEGAL)}${d.showPhotos === false ? '' : ' 원본 여부는 각 사진의 SHA-256 값으로 자취실록 원본 검증에서 확인할 수 있습니다.'}</div>
  </body></html>`;
}

/** Native: write a PDF file and open the share sheet (save to Files, KakaoTalk, mail…). Web: browser print dialog → "PDF로 저장". */
export async function exportPdf(doc: PdfDoc) {
  const html = renderHtml(doc);
  if (Platform.OS === 'web') return Print.printAsync({ html });
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: doc.title });
}
