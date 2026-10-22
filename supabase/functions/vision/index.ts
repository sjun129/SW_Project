// 자취실록 vision function (FR-06 AI 하자 태깅, 계약서 자동 채우기)
// Deploy:  npx supabase functions deploy vision --project-ref <project-ref>
// Secret:  OPENAI_API_KEY (Dashboard → Edge Functions → Secrets). Optional OPENAI_MODEL.
import { withSupabase } from "npm:@supabase/server@1";

const MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-6-astra";
const MAX_DATA_URL = 6_000_000; // ~4.5 MB image

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const DEFECT_LABELS = [
  "곰팡이",
  "찢김",
  "스크래치",
  "얼룩",
  "파손",
  "들뜸",
  "누수 흔적",
];
const box = { type: "number", minimum: 0, maximum: 1 };
const DEFECT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["defects"],
  properties: {
    defects: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "x", "y", "w", "h", "confidence"],
        properties: {
          label: { type: "string", enum: DEFECT_LABELS },
          x: box,
          y: box,
          w: box,
          h: box,
          confidence: { type: "integer", minimum: 0, maximum: 100 },
        },
      },
    },
  },
};
const LEASE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["address", "start_date", "end_date", "deposit", "landlord_phone"],
  properties: {
    address: { type: "string" },
    start_date: { type: "string" },
    end_date: { type: "string" },
    deposit: { type: "integer", minimum: 0 },
    landlord_phone: { type: "string" },
  },
};

async function ask(
  image: string,
  prompt: string,
  name: string,
  schema: object,
) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      input: [{
        role: "user",
        content: [{ type: "input_text", text: prompt }, {
          type: "input_image",
          image_url: image,
          detail: "high",
        }],
      }],
      text: { format: { type: "json_schema", name, schema, strict: true } },
    }),
  });
  if (!r.ok) {
    throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`);
  }
  const out = await r.json();
  const content = out.output?.find((o: { type: string }) =>
    o.type === "message"
  )?.content?.[0];
  if (!content || content.type === "refusal") {
    throw new Error("model refused or returned nothing");
  }
  return JSON.parse(content.text);
}

const DEFECT_PROMPT = (zone: string, stage: string) =>
  `한국 원룸·오피스텔의 "${zone}" 사진이에요 (${stage} 기록).
눈에 분명히 보이는 하자만 찾아 주세요: ${DEFECT_LABELS.join(", ")}.
- 그림자, 조명 반사, 원래 무늬, 정상적인 이음매는 하자가 아니에요.
- 위치는 사진 전체를 0~1로 본 좌상단 기준 박스(x, y, w, h)로 주세요.
- 확신도(confidence)는 0~100. 확실하지 않으면 넣지 마세요.
- 하자가 없으면 빈 배열을 주세요.
이 결과는 참고용 표시이며 법률 판단이 아니에요.`;

const LEASE_PROMPT =
  `한국 주택 임대차 계약서 사진이에요. 다음 값을 계약서에 적힌 그대로 읽어 주세요.
- address: 임차 목적물 소재지 (동·호수 포함)
- start_date, end_date: 임대차 기간, YYYY-MM-DD 형식
- deposit: 보증금 원 단위 정수 (월세는 제외)
- landlord_phone: 임대인 전화번호 (숫자와 하이픈)
읽을 수 없는 값은 문자열은 "", 숫자는 0으로 주세요. 추측하지 마세요.`;

const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const userId = ctx.userClaims?.id;
  if (!userId) return json({ error: "login required" }, 401);
  const body = await req.json().catch(() => null);
  try {
    if (body?.task === "defects") {
      const keyPath = String(body.storage_key ?? "");
      // the path starts with the owner's id; the signed URL below is also created under the caller's RLS
      if (!keyPath.startsWith(`${userId}/`)) {
        return json({ error: "not your photo" }, 403);
      }
      const { data, error } = await ctx.supabase.storage.from("originals")
        .createSignedUrl(keyPath, 300);
      if (error || !data) {
        return json({ error: error?.message ?? "photo not found" }, 404);
      }
      const res = await ask(
        data.signedUrl,
        DEFECT_PROMPT(String(body.zone ?? "방"), String(body.stage ?? "입주")),
        "defects",
        DEFECT_SCHEMA,
      );
      return json({ defects: res.defects, model: MODEL });
    }
    if (body?.task === "lease") {
      const image = String(body.image ?? "");
      if (!/^data:image\/(jpeg|png|webp);base64,/.test(image)) {
        return json({ error: "image must be a base64 data URL" }, 400);
      }
      if (image.length > MAX_DATA_URL) {
        return json({ error: "image too large" }, 413);
      }
      return json({
        lease: await ask(image, LEASE_PROMPT, "lease", LEASE_SCHEMA),
        model: MODEL,
      });
    }
    return json({ error: "unknown task" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});

export default {
  fetch: (
    req: Request,
  ) => (req.method === "OPTIONS"
    ? new Response("ok", { headers: cors })
    : handler(req)),
};
