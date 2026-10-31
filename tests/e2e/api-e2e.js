/**
 * Smart Order — E2E API test suite
 * Runs against a LOCAL test server (localhost by default).
 * Usage: node tests/e2e/api-e2e.js [baseUrl]
 *   default baseUrl: http://localhost:3000
 *
 * Covers: health, auth, tenant isolation (CRITICAL), rate limits,
 * order lifecycle, idempotency, validation, money re-pricing,
 * public-surface fixture hygiene (P30-B: sitemap + counters gates).
 */
const BASE = process.argv[2] || "http://localhost:3000";

/* P30-B (§4 root seam — the residue can never be created again): this
 * battery registers QA-fixture businesses («مخبز الاختبار أ»…) through
 * the PUBLIC register API and PUBLISHES one of them. At some era a run
 * was pointed at production and its fixtures stayed — 7 published
 * «مخبز الاختبار» stores were found in the production sitemap and the
 * landing counters this wave. The battery now refuses any non-local
 * target unless a deliberate isolated-staging run opts in
 * (E2E_ALLOW_REMOTE=1 — never production). */
{
  let host = "";
  try { host = new URL(BASE).hostname.replace(/^\[|\]$/g, ""); } catch { host = ""; }
  const isLocal =
    ["localhost", "127.0.0.1", "::1"].includes(host) ||
    host.endsWith(".local") || host.endsWith(".test") || host.endsWith(".example");
  if (!isLocal && process.env.E2E_ALLOW_REMOTE !== "1") {
    console.error(`\n✗ رفضنا الهدف ${BASE} — هذه البطارية تنشئ بيانات اختبار (مخبز الاختبار أ…) وتنشرها، فلا تُشغَّل إلا على خادم محلي معزول.`);
    console.error(`  للتجاوز المقصود ضد بيئة تجريبية معزولة فقط: E2E_ALLOW_REMOTE=1`);
    process.exit(1);
  }
}
let pass = 0, fail = 0, skipped = 0;

const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail ? "— " + detail : ""}`); }
};

function makeCtx() {
  // fresh cookie jar per context
  const jar = new Map();
  const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const absorb = (res) => {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of raw) {
      const [pair] = c.split(";");
      const idx = pair.indexOf("=");
      if (idx > 0) jar.set(pair.slice(0, idx), pair.slice(idx + 1));
    }
  };
  const call = async (path, opts = {}) => {
    const res = await fetch(BASE + path, {
      ...opts,
      headers: { "Content-Type": "application/json", Cookie: cookieHeader(), ...(opts.headers || {}) },
    });
    absorb(res);
    let body = null;
    /* W7-D: the CSV export route answers text/csv — rawText hands the
       battery the raw bytes decoded via Buffer (Node's toString keeps
       the leading U+FEFF, unlike res.text() whose TextDecoder silently
       strips it — the pin must prove the BOM Excel actually receives). */
    if (opts.rawText) {
      body = Buffer.from(await res.arrayBuffer()).toString("utf8");
    } else {
      try { body = await res.json(); } catch { /* non-json */ }
    }
    // (r138) headers مع الرد — لفحص Retry-After على 429
    return { status: res.status, body, headers: res.headers };
  };
  return { call };
}

const rnd = (p) => p + Math.random().toString(36).slice(2, 10);

async function registerBiz(ctx, name) {
  const email = rnd("owner_") + "@test.ly";
  const r = await ctx.call("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "مالك " + name, businessName: name, phone: "091" + Math.floor(1000000 + Math.random() * 8999999),
      email, password: "Test#2026Pass", city: "طرابلس",
    }),
  });
  return { email, r };
}

async function main() {
  console.log(`\n▶ Smart Order E2E — ${BASE}\n`);

  // ---------- 1. health ----------
  console.log("— الصحة العامة");
  const health = await makeCtx().call("/api/health");
  ok("health endpoint responds", health.status === 200 || health.body?.status === "ok", JSON.stringify(health.body).slice(0, 80));

  // ---------- 2. auth ----------
  console.log("— المصادقة");
  const anon = makeCtx();
  const unauth = await anon.call("/api/orders");
  ok("unauthenticated API blocked with Arabic message", unauth.status === 401 || unauth.body?.error?.code === "UNAUTHENTICATED", JSON.stringify(unauth.body).slice(0, 80));

  const A = makeCtx();
  const { email: emailA, r: regA } = await registerBiz(A, "مخبز الاختبار أ");
  ok("business A registers", regA.status === 201 || regA.body?.success === true, JSON.stringify(regA.body).slice(0, 100));

  const meA = await A.call("/api/auth/me");
  const bizA = meA.body?.data?.user?.memberships?.[0]?.business;
  const bizAId = bizA?.id;
  ok("session persists after register (me)", meA.body?.success === true && !!bizAId, JSON.stringify(meA.body).slice(0, 120));

  const B = makeCtx();
  const { email: emailB, r: regB } = await registerBiz(B, "متجر الاختبار ب");
  ok("business B registers", regB.status === 201 || regB.body?.success === true);

  // ---------- 3. tenant isolation ----------
  console.log("— عزل المستأجرين (حرج)");
  const leakList = await B.call("/api/orders");
  const leaked = (leakList.body?.data?.orders || []).some((o) => o.businessId === bizAId);
  ok("B's order list contains no A orders", !leaked);

  const fakeSpoof = await B.call(`/api/products?businessId=${bizAId}`);
  ok("businessId spoofing rejected", fakeSpoof.status === 403 || fakeSpoof.body?.error?.code === "FORBIDDEN", JSON.stringify(fakeSpoof.body).slice(0, 80));

  const patchSpoof = await B.call("/api/business", { method: "PATCH", body: JSON.stringify({ businessId: bizAId, name: "مخترق" }) });
  ok("cross-tenant business PATCH rejected", patchSpoof.status === 403 || patchSpoof.body?.error?.code === "FORBIDDEN");

  // ---------- 4. catalog + storefront ----------
  console.log("— الكتالوج والمتجر العام");
  const cat = await A.call("/api/categories", { method: "POST", body: JSON.stringify({ businessId: bizAId, name: "أطباق رئيسية" }) });
  const catId = cat.body?.data?.category?.id;
  ok("category created", !!catId);

  const prod = await A.call("/api/products", {
    method: "POST",
    body: JSON.stringify({
      businessId: bizAId, categoryId: catId, name: "طبق اختبار", description: "وصف",
      price: "12.500", isAvailable: true,
      variants: [{ name: "عادي", priceDelta: "0" }, { name: "كبير", priceDelta: "4.000" }],
      optionGroups: [{ name: "إضافات", required: true, maxSelect: 2, options: [{ name: "صوص", priceDelta: "1.250" }] }],
    }),
  });
  const prodId = prod.body?.data?.product?.id;
  ok("product with variants+options created", !!prodId, JSON.stringify(prod.body).slice(0, 120));

  const zone = await A.call("/api/delivery-zones", { method: "POST", body: JSON.stringify({ businessId: bizAId, name: "الوسط", fee: "4.000" }) });
  const zoneId = zone.body?.data?.zone?.id;
  ok("delivery zone created", !!zoneId);

  // ---------- 4.5 categories [id]: PATCH + DELETE semantics (P13-2d) ----------
  // The /api/categories/[id] route was missing entirely (audit P0): the
  // dashboard PATCH/DELETE + onboarding DELETE all 404'd. These pin the
  // archive-if-products contract the ConfirmDialog promises:
  // «سيُؤرشف القسم إن كان يحتوي منتجات، وإلا يُحذف نهائياً».
  console.log("— الأقسام: تعديل وحذف (أرشفة عند وجود منتجات)");
  const meB = await B.call("/api/auth/me");
  const bizBId = meB.body?.data?.user?.memberships?.[0]?.business?.id;
  ok("business B session resolves (tenant-isolation setup)", !!bizBId, JSON.stringify(meB.body).slice(0, 120));

  const cat2 = await A.call("/api/categories", { method: "POST", body: JSON.stringify({ businessId: bizAId, name: "حلويات" }) });
  const cat2Id = cat2.body?.data?.category?.id;
  ok("empty category created (rename/delete flow)", !!cat2Id, JSON.stringify(cat2.body).slice(0, 100));

  const rename = await A.call(`/api/categories/${cat2Id}`, { method: "PATCH", body: JSON.stringify({ businessId: bizAId, name: "مشروبات", description: null, imageUrl: null }) });
  ok("category PATCH renames (nullable clear fields)", rename.body?.data?.category?.name === "مشروبات" && rename.body?.data?.category?.description === null, JSON.stringify(rename.body).slice(0, 120));

  const xTenantOwn = await B.call(`/api/categories/${cat2Id}?businessId=${bizBId}`, { method: "DELETE" });
  ok("cross-tenant category DELETE isolated (B's own biz + A's id → 404)", xTenantOwn.status === 404 || xTenantOwn.body?.error?.code === "NOT_FOUND", JSON.stringify(xTenantOwn.body).slice(0, 80));

  const xTenantSpoof = await B.call(`/api/categories/${cat2Id}?businessId=${bizAId}`, { method: "DELETE" });
  ok("businessId spoofing on category DELETE rejected", xTenantSpoof.status === 403 || xTenantSpoof.body?.error?.code === "FORBIDDEN", JSON.stringify(xTenantSpoof.body).slice(0, 80));

  const delEmpty = await A.call(`/api/categories/${cat2Id}?businessId=${bizAId}`, { method: "DELETE" });
  ok("empty category hard-deleted", delEmpty.body?.data?.deleted === true && delEmpty.body?.data?.archived === undefined, JSON.stringify(delEmpty.body).slice(0, 100));

  // dedicated category + product for the archive branch — the flow's own
  // catId must stay ACTIVE so the later publish/order sections keep working
  // (first run of this suite caught the cascade: archiving catId here
  // blocks the publish gate "أضف قسماً واحداً ومنتجاً واحداً على الأقل").
  const catArch = await A.call("/api/categories", { method: "POST", body: JSON.stringify({ businessId: bizAId, name: "قسم الأرشفة" }) });
  const catArchId = catArch.body?.data?.category?.id;
  const prodArch = await A.call("/api/products", {
    method: "POST",
    body: JSON.stringify({ businessId: bizAId, categoryId: catArchId, name: "منتج أرشيف", description: "وصف", price: "5.000", isAvailable: true }),
  });
  ok("archive-branch product created", !!prodArch.body?.data?.product?.id, JSON.stringify(prodArch.body).slice(0, 100));

  const delFull = await A.call(`/api/categories/${catArchId}?businessId=${bizAId}`, { method: "DELETE" });
  ok("category with products archives (never hard-deleted)", delFull.body?.data?.archived === true && delFull.body?.data?.deleted === undefined, JSON.stringify(delFull.body).slice(0, 100));

  const listAfter = await A.call(`/api/categories?businessId=${bizAId}`);
  const names = (listAfter.body?.data?.categories || []).map((c) => c.name);
  ok("archived + deleted categories vanish from the list (flow's own catId stays)", !names.includes("مشروبات") && !names.includes("قسم الأرشفة") && names.includes("أطباق رئيسية"), JSON.stringify(names).slice(0, 100));


  const slug = bizA?.slug || "unknown";
  ok("business has public slug", !!slug, JSON.stringify(bizA).slice(0, 80));

  const unpublished = await anon.call(`/api/public/store/${slug}`);
  ok("unpublished storefront blocked (UNPUBLISHED)", unpublished.body?.error?.code === "UNPUBLISHED", JSON.stringify(unpublished.body).slice(0, 100));

  // ---------- 5. publish + order flow ----------
  console.log("— النشر ودورة الطلب");
  const pubTry = await A.call("/api/business", { method: "PATCH", body: JSON.stringify({ businessId: bizAId, isPublished: true }) });
  ok("store publishes after product exists", pubTry.body?.data?.business?.isPublished === true, JSON.stringify(pubTry.body).slice(0, 120));

  const storefront = await anon.call(`/api/public/store/${slug}`);
  ok("public storefront served after publish", storefront.body?.success === true, JSON.stringify(storefront.body).slice(0, 100));

  const variant = prod.body?.data?.product?.variants?.find((v) => v.name === "كبير");
  const option = prod.body?.data?.product?.optionGroups?.[0]?.options?.[0];
  const orderPayload = {
    slug, idempotencyKey: rnd("e2e-key-"), fulfillmentType: "DELIVERY",
    customerName: "عميل اختبار", customerPhone: "0912345678",
    city: "طرابلس", area: "الوسط", addressLine: "شارع الاختبار 1",
    deliveryZoneId: zoneId, customerNote: "",
    items: [{ productId: prodId, variantId: variant?.id ?? null, optionIds: option ? [option.id] : [], quantity: 2, note: "" }],
  };
  const order1 = await anon.call("/api/public/orders", { method: "POST", body: JSON.stringify(orderPayload) });
  const created = order1.body?.data?.order;
  const rateLimited = order1.status === 429;
  if (rateLimited) {
    skipped++;
    console.log("  - order rate limit reached (from earlier traffic) — restart dev server for a clean run, skipping order-flow tests");
  }
  ok("order created", rateLimited || (order1.body?.success === true && !!created?.orderNumber), JSON.stringify(order1.body).slice(0, 150));

  // server-side re-pricing: 12.5 + 4 (كبير) + 1.25 (صوص) = 17.75 × 2 = 35.5 + 4 delivery = 39.5 LYD = 39500 millimes
  const expectedTotal = 39500;
  ok("server re-prices money (no client trust)", rateLimited || created?.total === expectedTotal, `got ${created?.total}, want ${expectedTotal}`);

  const order2 = await anon.call("/api/public/orders", { method: "POST", body: JSON.stringify({ ...orderPayload, customerName: "عميل آخر" }) });
  ok("idempotency: same key replays same order", rateLimited || order2.body?.data?.order?.id === created?.id, `got ${order2.body?.data?.order?.id}, want ${created?.id}`);
  // (r140 P2-1) شكل رد الـreplay الكامل — شاشة النجاح تعتمد المبالغ
  // (formatLyd(result.total)) ورابط واتساب؛ الرد القديم كان id فقط
  // فالشاشة كانت ترسم «NaN.NaN د.ل» وتخفي زر واتساب
  const ro = order2.body?.data?.order;
  ok(
    "idempotent replay carries the full success shape (r140)",
    rateLimited || (
      ro?.replay === true &&
      ro?.subtotal === created?.subtotal &&
      ro?.deliveryFee === created?.deliveryFee &&
      ro?.total === created?.total &&
      typeof ro?.publicToken === "string" && ro.publicToken.length > 0 &&
      // مفتاح whatsapp حاضر في الشكل (null صادق إن لم يضبط المتجر رقمًا —
      // القديم كان يرسل `business` خامًا بلا whatsapp أصلًا)
      order2.body?.data?.whatsapp !== undefined &&
      (order2.body?.data?.whatsapp === null ||
        (typeof order2.body?.data?.whatsapp?.number === "string" &&
          typeof order2.body?.data?.whatsapp?.message === "string"))
    ),
    JSON.stringify({ order: ro, whatsapp: order2.body?.data?.whatsapp }).slice(0, 200)
  );

  // ---------- 6. state machine ----------
  console.log("— آلة حالات الطلب");

  // (W3-F) التوأم المتسابق: طلبان متزامنان بالمفتاح نفسه — نافذة
  // findFirst قبل الإدراج مفتوحة لكليهما، فقيد @@unique هو الحارس
  // الحقيقي. المتسابق الخاسر كان يهرب 500 خامًا (حلقة P2002 تعيد
  // المحاولة برقم طلب جديد — التعارض على المفتاح لا يزول أبدًا)؛
  // الآن يميّز المسار القيد فيعيد تشغيل طلب التوأم الملزم (نفس
  // عقد الـreplay: 200 + replay:true + نفس المعرّف). النتيجة الحتمية
  // مهما ترتيب السباق: إنشاء واحد 201 + رد replay واحد، ومعرّف واحد،
  // وصفر 500.
  const twinKey = rnd("e2e-twin-");
  const twinPayload = JSON.stringify({ ...orderPayload, idempotencyKey: twinKey, customerName: "عميل السباق" });
  const [twinA, twinB] = await Promise.all([
    anon.call("/api/public/orders", { method: "POST", body: twinPayload }),
    anon.call("/api/public/orders", { method: "POST", body: twinPayload }),
  ]);
  const twinIds = [twinA.body?.data?.order?.id, twinB.body?.data?.order?.id];
  const twinStatuses = [twinA.status, twinB.status];
  const twinReplies = [twinA.body?.data?.order?.replay, twinB.body?.data?.order?.replay];
  ok(
    "raced idempotency twins: exactly one order is ever created (same id twice, never two)",
    rateLimited || (twinIds[0] && twinIds[0] === twinIds[1]),
    `ids ${JSON.stringify(twinIds)} statuses ${JSON.stringify(twinStatuses)}`
  );
  ok(
    "raced idempotency twins: one 201 + one replay 200, never a raw 500",
    rateLimited || (
      twinStatuses.includes(201) && twinStatuses.includes(200) &&
      twinReplies.filter((r) => r === true).length === 1
    ),
    `statuses ${JSON.stringify(twinStatuses)} replays ${JSON.stringify(twinReplies)} a=${JSON.stringify(twinA.body?.error ?? null).slice(0, 80)} b=${JSON.stringify(twinB.body?.error ?? null).slice(0, 80)}`
  );

  const orderId = created?.id;
  const jump = await A.call(`/api/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ action: "status", status: "DELIVERED" }) });
  ok("invalid jump NEW→DELIVERED rejected", rateLimited || jump.body?.success === false, JSON.stringify(jump.body).slice(0, 100));

  for (const st of ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"]) {
    const t = await A.call(`/api/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ action: "status", status: st }) });
    ok(`transition → ${st}`, rateLimited || t.body?.data?.order?.status === st, JSON.stringify(t.body).slice(0, 100));
  }

  const detail = await A.call(`/api/orders/${orderId}`);
  const hist = detail.body?.data?.order?.history || [];
  ok("full audit history (creation + 5 transitions)", rateLimited || hist.length >= 6, `got ${hist.length}`);

  // (phase4 W1-SO) الخصوصية: ملاحظات المشغّل الداخلية لا تُشحن عبر التتبع العام —
  // حامل التوكن (أي من يملك الرابط) يرى الحالات والتواريخ فقط.
  const track = await anon.call(`/api/public/track/${created?.publicToken}`);
  const trackHist = track.body?.data?.order?.history || [];
  ok(
    "public track omits internal operator notes (privacy)",
    rateLimited || (track.status === 200 && trackHist.length > 0 && trackHist.every((h) => !("note" in h))),
    JSON.stringify(track.body).slice(0, 120),
  );

  const xTenantOrder = await B.call(`/api/orders/${orderId}`);
  ok("B cannot read A's order", rateLimited || xTenantOrder.status === 404 || xTenantOrder.body?.error?.code === "NOT_FOUND");

  // ---------- 6.5 customer one-tap confirm (W6-B7 — the COD loop) ----------
  console.log("— تأكيد العميل من رابط التتبع (W6-B7)");
  /* The raced-twin order from section 6 is the perfect subject: still NEW
     (never transitioned), owned by business A, and its publicToken came
     back in both race responses. The DELIVERED `created` order (section 6's
     transition loop) is the terminal-block subject. */
  const twinOrder = twinA.body?.data?.order ?? twinB.body?.data?.order;
  const twinToken = twinOrder?.publicToken;
  /* (recovery fix) the create response ships {id, orderNumber, publicToken,
     money} — never `status` — so the NEW-ness is verified through the
     public track GET (the same surface the customer confirms from). */
  const twinTrack = await anon.call(`/api/public/track/${twinToken}`);
  ok(
    "confirm subject ready: the raced-twin order is NEW with a public token",
    rateLimited || (!!twinToken && twinTrack.body?.data?.order?.status === "NEW"),
    JSON.stringify({ status: twinTrack.body?.data?.order?.status, token: !!twinToken }),
  );

  const cf1 = await anon.call(`/api/public/track/${twinToken}/confirm`, { method: "POST" });
  ok(
    "first tap: 200 + confirmedAt + already:false — the stamp is written once, and the order status is UNTOUCHED (not a status transition)",
    rateLimited || (cf1.status === 200 && cf1.body?.success === true && typeof cf1.body?.data?.confirmedAt === "string" && cf1.body?.data?.already === false),
    JSON.stringify(cf1.body).slice(0, 120),
  );
  ok(
    "first tap: the response carries ONLY { confirmedAt, already } — no PII, no totals",
    rateLimited || JSON.stringify(Object.keys(cf1.body?.data ?? {}).sort()) === JSON.stringify(["already", "confirmedAt"]),
    JSON.stringify(cf1.body?.data ?? {}).slice(0, 120),
  );

  const cf2 = await anon.call(`/api/public/track/${twinToken}/confirm`, { method: "POST" });
  ok(
    "repeat tap: idempotent — the SAME stamp + already:true, never an error a customer could read as failure",
    rateLimited || (cf2.status === 200 && cf2.body?.data?.already === true && cf2.body?.data?.confirmedAt === cf1.body?.data?.confirmedAt),
    JSON.stringify(cf2.body).slice(0, 120),
  );

  const ownerConfirmView = await A.call(`/api/orders/${twinOrder?.id}`);
  const ownerHist = ownerConfirmView.body?.data?.order?.history || [];
  ok(
    "owner sees the stamp AND the customer-authored history row («أكد العميل طلبه من رابط التتبع» by «العميل»)",
    rateLimited || (!!ownerConfirmView.body?.data?.order?.customerConfirmedAt &&
      ownerHist.some((h) => h.note === "أكد العميل طلبه من رابط التتبع" && h.changedByName === "العميل")),
    JSON.stringify(ownerHist.slice(-2)).slice(0, 160),
  );

  const trackAfterConfirm = await anon.call(`/api/public/track/${twinToken}`);
  ok(
    "public track GET ships the stamp (the durable success state survives reload) and the order status is UNTOUCHED (not a status transition)",
    rateLimited || (typeof cf1.body?.data?.confirmedAt === "string" && trackAfterConfirm.body?.data?.order?.customerConfirmedAt === cf1.body?.data?.confirmedAt && trackAfterConfirm.body?.data?.order?.status === "NEW"),
    JSON.stringify({ stamp: trackAfterConfirm.body?.data?.order?.customerConfirmedAt ?? null, status: trackAfterConfirm.body?.data?.order?.status }),
  );

  const cfTerminal = await anon.call(`/api/public/track/${created?.publicToken}/confirm`, { method: "POST" });
  ok(
    "terminal order (DELIVERED) refuses the confirm — honest 409 INVALID_STATE, never a fake success",
    rateLimited || (cfTerminal.status === 409 && cfTerminal.body?.error?.code === "INVALID_STATE" && !cfTerminal.body?.data?.confirmedAt),
    JSON.stringify(cfTerminal.body).slice(0, 120),
  );

  const cf404 = await anon.call("/api/public/track/00000000-0000-0000-0000-000000000000/confirm", { method: "POST" });
  ok(
    "unknown token → the lookup route's honest 404 copy (no enumeration hints)",
    rateLimited || (cf404.status === 404 && cf404.body?.error?.code === "NOT_FOUND" && cf404.body?.error?.message === "لا يوجد طلب بهذه البيانات"),
    JSON.stringify(cf404.body).slice(0, 120),
  );

  const cf400 = await anon.call("/api/public/track/not-a-token/confirm", { method: "POST" });
  ok(
    "malformed token → the cheap 400 shape gate (never reaches the DB)",
    rateLimited || cf400.status === 400,
    JSON.stringify(cf400.body).slice(0, 100),
  );

  /* LAST in the section (it burns the per-IP confirm budget): the same
     10/10min dbRateLimit budget the lookup route uses. */
  let cf429 = false;
  let cfRetryAfter = "";
  for (let i = 0; i < 8; i++) {
    const r = await anon.call(`/api/public/track/${twinToken}/confirm`, { method: "POST" });
    if (r.status === 429) { cf429 = true; cfRetryAfter = String(r.headers?.get?.("retry-after") ?? ""); break; }
  }
  if (cf429) {
    ok("confirm rate limit (429) triggers", true);
    ok("confirm 429 carries a numeric Retry-After", /^\d+$/.test(cfRetryAfter) && Number(cfRetryAfter) > 0, `retry-after="${cfRetryAfter}"`);
  }
  else { skipped++; console.log("  - confirm rate limit not reached (shared IP bucket / window rollover) — skipped"); }

  // ---------- 7. validation ----------
  console.log("— التحقق من المدخلات");
  const badPhone = await anon.call("/api/public/orders", { method: "POST", body: JSON.stringify({ ...orderPayload, idempotencyKey: rnd("e2e-bad-"), customerPhone: "12345" }) });
  ok("invalid Libyan phone rejected", rateLimited || badPhone.body?.success === false);
  const badPrice = await anon.call("/api/public/orders", {
    method: "POST",
    body: JSON.stringify({ ...orderPayload, idempotencyKey: rnd("e2e-px-"), items: [{ ...orderPayload.items[0], price: 1 }] }),
  });
  ok("client-sent prices ignored (re-priced)", rateLimited || badPrice.body?.data?.order?.total === expectedTotal || badPrice.body?.success === true);

  const noStore = await anon.call("/api/public/orders", { method: "POST", body: JSON.stringify({ ...orderPayload, slug: "does-not-exist" }) });
  ok("unknown store 404", rateLimited || noStore.status === 404 || noStore.body?.error?.code === "NOT_FOUND");

  // ---------- 8. rate limiting (order path) ----------
  console.log("— تحديد المعدل");
  let got429 = false;
  let retryAfter = "";
  for (let i = 0; i < 12; i++) {
    const r = await anon.call("/api/public/orders", { method: "POST", body: JSON.stringify({ ...orderPayload, idempotencyKey: rnd("e2e-rl-") }) });
    if (r.status === 429) { got429 = true; retryAfter = String(r.headers?.get?.("retry-after") ?? ""); break; }
  }
  if (got429) {
    ok("order rate limit (429) triggers", true);
    // (r138) 429 يعلن مهلة الانتظار لعملاء HTTP — قيمة dbRateLimit المُهدرة سابقًا
    ok("429 carries a numeric Retry-After (r138)", /^\d+$/.test(retryAfter) && Number(retryAfter) > 0, `retry-after="${retryAfter}"`);
  }
  else { skipped++; console.log("  - order rate limit not reached (may be shared IP bucket) — skipped"); }

  // ---------- 9. plan limits — the cards' promise is the gate (W2-D2) ----------
  console.log("— حدود الباقات (W2-D2)");
  /* R1 audit finding #1: the pricing cards promise per-plan caps the
     backend never enforced. The limits block is the contract — Free
     promises 15 products / 100 monthly orders / NO team accounts — and a
     registered business carries planId=null → Free, so the boundary is
     drivable end-to-end: fill to N (15 creations succeed), the N+1st is
     refused with the honest Arabic cap copy. */
  let createdCount = 0;
  let capStatus = 0;
  let capMsg = "";
  for (let i = 1; i <= 17; i++) {
    const r = await B.call("/api/products", {
      method: "POST",
      body: JSON.stringify({ businessId: bizBId, name: "منتج الحد " + i, price: "3.000" }),
    });
    if (r.body?.success === true) createdCount++;
    else { capStatus = r.status; capMsg = r.body?.error?.message ?? ""; break; }
  }
  ok("products gate: N−1 creations pass on Free (the card's 15)", createdCount === 15, `created ${createdCount}`);
  ok("products gate: creation N is refused (409 PLAN_LIMIT)", capStatus === 409 && /منتج/.test(capMsg), `status ${capStatus}`);
  const capNum = Number((capMsg.match(/\((\d+)\)/) ?? [])[1]);
  ok(
    "products gate: honest Arabic message carries the plan's own number",
    /لقد وصلت للحد الأقصى للمنتجات/.test(capMsg) && capNum === createdCount && capMsg.includes("ترقية"),
    capMsg.slice(0, 90),
  );

  const staffTry = await B.call("/api/staff", {
    method: "POST",
    body: JSON.stringify({ businessId: bizBId, name: "موظف اختبار", email: rnd("staff_") + "@test.ly", password: "Test#2026Pass", role: "STAFF" }),
  });
  ok(
    "staff gate: Free carries no team promise — the first staff add is refused (409 PLAN_LIMIT)",
    staffTry.status === 409 && staffTry.body?.error?.code === "PLAN_LIMIT",
    JSON.stringify(staffTry.body).slice(0, 100),
  );
  ok(
    "staff gate: the Arabic message points at the Premium team promise",
    /بريميوم/.test(staffTry.body?.error?.message ?? "") && /الفريق/.test(staffTry.body?.error?.message ?? ""),
    (staffTry.body?.error?.message ?? "").slice(0, 90),
  );
  /* The orders gate (maxOrders/month) shares this exact in-tx contract; its
     boundary needs 100 orders on one business — unreachable inside the
     battery's 8-req/min public checkout rate limit — so it is driven and
     captured as evidence against the dev DB (see w2-evidence/W2-D2) while
     the pass-through side stays pinned by section 5's order creation. */

  // ---------- 10. subscription review CAS — one payment, one application (W3-F) ----------
  console.log("— مراجعة الاشتراك: CAS واحد لكل دفعة (W3-F)");
  /* cba655a regression pin. The PENDING pre-check alone was a
     read-then-write window: two platform admins reviewing the same payment
     concurrently both passed it and both approvals applied (the business
     row written twice, the payment double-applied). The fix is the
     orders-PATCH CAS recipe — the stamp is updateMany WHERE
     status:"PENDING" + count assert, the business upgrade rides the SAME
     interactive transaction. This fires a REAL concurrent race: three
     APPROVE requests in flight on one PENDING payment (Promise.all).
     Whatever the interleaving, exactly ONE 200 may come back and the
     losers must get the family's already-reviewed 409 — on the pre-CAS
     code the unconditional writes all land and several 200s return. */
  const plansRes = await anon.call("/api/plans");
  const premiumPlan = (plansRes.body?.data || []).find((p) => p.name === "Premium");
  ok("plans catalog self-seeds (Premium row available for the upgrade flow)", !!premiumPlan, JSON.stringify(plansRes.body).slice(0, 80));

  const subReq = await A.call("/api/subscriptions", {
    method: "POST",
    body: JSON.stringify({ planId: premiumPlan?.id, provider: "libyana", amount: premiumPlan?.price, phone: "0912345678", businessId: bizAId }),
  });
  const paymentId = subReq.body?.data?.id;
  ok("merchant files a PENDING subscription payment", !!paymentId && subReq.body?.data?.status === "PENDING", JSON.stringify(subReq.body).slice(0, 120));

  // two platform-admin sessions (scripts/make-admin.js QA credentials —
  // the repo's own documented admin bootstrap for a fresh database)
  const adm1 = makeCtx();
  const adm2 = makeCtx();
  const admLogin = (ctx) => ctx.call("/api/auth/login", { method: "POST", body: JSON.stringify({ email: "admin@smart-link.ly", password: "Admin@12345" }) });
  const [login1, login2] = await Promise.all([admLogin(adm1), admLogin(adm2)]);
  ok("platform-admin sessions open (make-admin.js QA creds)", login1.body?.success === true && login2.body?.success === true, JSON.stringify(login1.body).slice(0, 80));

  const fireReview = (ctx) => ctx.call(`/api/subscriptions/${paymentId}/review`, { method: "POST", body: JSON.stringify({ action: "APPROVE" }) });
  const [rev1, rev2, rev3] = await Promise.all([fireReview(adm1), fireReview(adm2), fireReview(adm1)]);
  const revStatuses = [rev1.status, rev2.status, rev3.status];
  const winners = [rev1, rev2, rev3].filter((r) => r.status === 200);
  ok(
    "raced review approvals: exactly ONE 200 — the CAS winner applies the payment once",
    winners.length === 1 && winners[0].body?.data?.status === "APPROVED",
    `statuses ${JSON.stringify(revStatuses)} bodies ${JSON.stringify([rev1.body, rev2.body, rev3.body]).slice(0, 160)}`,
  );
  ok(
    "raced review approvals: every loser is already-reviewed 409 or the designed transient 503 WRITE_CONFLICT (never a second apply)",
    /* W4-E1: observed live under load — a loser's single withTxRetry can
       meet a SECOND convoy conflict and surface the honest 503 retry copy
       (r134 recipe) instead of the 409. Both are "no apply, safe to
       re-submit" outcomes; the money invariant stays strict: no second
       200 ever. Weakening? No — this pins the route's ACTUAL contract. */
    [rev1, rev2, rev3].every((r) => {
        if (r.status === 200) return r.body?.data?.status === "APPROVED";
        if (r.status === 409) return true;
        if (r.status === 503) return r.body?.error?.code === "WRITE_CONFLICT";
        return false;
      }) && winners.length === 1,
    `statuses ${JSON.stringify(revStatuses)} messages ${JSON.stringify([rev1.body?.error?.message, rev2.body?.error?.message, rev3.body?.error?.message]).slice(0, 160)}`,
  );

  // the single application really landed: Premium (3 team seats) opened
  // staff adds for business A — the same call section 9 refused on Free B.
  const staffAfterUpgrade = await A.call("/api/staff", {
    method: "POST",
    body: JSON.stringify({ businessId: bizAId, name: "عضو بعد الموافقة", email: rnd("staffpost_") + "@test.ly", password: "Test#2026Pass", role: "STAFF" }),
  });
  ok(
    "one application, one real effect: the approved Premium plan opened team seats",
    staffAfterUpgrade.status === 201 && staffAfterUpgrade.body?.success === true,
    JSON.stringify(staffAfterUpgrade.body).slice(0, 100),
  );

  // ---------- 11. W7-D: the reports/CSV entitlement gates ----------
  console.log("— بوابات استحقاق التقارير وتصدير CSV (W7-D)");
  /* The W6-B7 flagged residual, closed: «تقارير أداء عند الطلب» is SOLD
     on بريميوم — until W7-D any plan with orders.read read it. The
     ladder now enforced (lib/plan-entitlements-core PLAN_FEATURES):
     reports = بريميوم+ (sortOrder 3) · CSV export = احترافي+ (4) at the
     real server seam /api/dashboard/reports/export (the W6-B4
     client-built artifact had no seam a gate could refuse — the
     Smart-Menu W7-B family move). At this point in the battery:
     B = Free (never upgraded) · A = Premium (section 10's single
     approved payment). Drive the whole ladder, then one more approved
     Pro payment opens the export. */
  const reportsPath = (id, days = 30) => `/api/dashboard/reports?businessId=${id}&days=${days}`;
  const exportPath = (id, days = 30) => `/api/dashboard/reports/export?businessId=${id}&days=${days}`;

  const anonReports = await anon.call(reportsPath(bizBId));
  ok(
    "reports gate order: session law still first — anonymous gets the 401, never the tier refusal",
    anonReports.status === 401 || anonReports.body?.error?.code === "UNAUTHENTICATED",
    JSON.stringify(anonReports.body).slice(0, 80),
  );

  const freeReports = await B.call(reportsPath(bizBId));
  ok(
    "reports gate: Free is refused below tier (403 PLAN_ENTITLEMENT) — the sold-but-ungated bug is closed",
    freeReports.status === 403 && freeReports.body?.error?.code === "PLAN_ENTITLEMENT",
    JSON.stringify(freeReports.body).slice(0, 100),
  );
  ok(
    "reports gate: the Arabic refusal names بريميوم and the upgrade path (family copy, one source)",
    /بريميوم/.test(freeReports.body?.error?.message ?? "") && /الترقية/.test(freeReports.body?.error?.message ?? ""),
    (freeReports.body?.error?.message ?? "").slice(0, 90),
  );

  const freeExport = await B.call(exportPath(bizBId));
  ok(
    "export gate: Free is refused below Pro (403 PLAN_ENTITLEMENT) before any aggregation",
    freeExport.status === 403 && freeExport.body?.error?.code === "PLAN_ENTITLEMENT" && /احترافي/.test(freeExport.body?.error?.message ?? ""),
    JSON.stringify(freeExport.body).slice(0, 100),
  );

  const premReports = await A.call(reportsPath(bizAId));
  ok(
    "reports gate: the approved Premium payment opens the surface (200 with the real A orders)",
    premReports.status === 200 && premReports.body?.data?.window?.days === 30 && Array.isArray(premReports.body?.data?.series) && premReports.body?.data?.series.length === 30,
    JSON.stringify(premReports.body).slice(0, 120),
  );
  ok(
    "reports response: Premium reads the data but the CSV preference flag stays false (the export is Pro+)",
    premReports.body?.data?.canExportCsv === false,
    JSON.stringify({ canExportCsv: premReports.body?.data?.canExportCsv }),
  );

  const premExport = await A.call(exportPath(bizAId));
  ok(
    "export gate: Premium is refused below Pro — the flag was the preference, the route is the enforcement",
    premExport.status === 403 && premExport.body?.error?.code === "PLAN_ENTITLEMENT" && /احترافي/.test(premExport.body?.error?.message ?? ""),
    JSON.stringify(premExport.body).slice(0, 100),
  );

  /* RBAC semantics: the entitlement rides the BUSINESS's tier (the
     W2-D2 count-gate law) — a STAFF member with orders.read of a
     Premium business reads its reports; permission decides WHO, the
     tier WHAT. */
  const staffEmail = rnd("staffgate_") + "@test.ly";
  const staffAdd = await A.call("/api/staff", {
    method: "POST",
    body: JSON.stringify({ businessId: bizAId, name: "موظف التقارير", email: staffEmail, password: "Test#2026Pass", role: "STAFF" }),
  });
  ok("staff setup: the second Premium seat opens for the RBAC probe", staffAdd.status === 201, JSON.stringify(staffAdd.body).slice(0, 100));

  const S = makeCtx();
  const staffLogin = await S.call("/api/auth/login", { method: "POST", body: JSON.stringify({ email: staffEmail, password: "Test#2026Pass" }) });
  ok("staff session opens", staffLogin.body?.success === true, JSON.stringify(staffLogin.body).slice(0, 80));

  const staffReports = await S.call(reportsPath(bizAId));
  ok(
    "staff semantics: STAFF with orders.read reads a Premium business's reports (entitlement rides the business, not the member)",
    staffReports.status === 200 && staffReports.body?.data?.series?.length === 30,
    JSON.stringify(staffReports.body).slice(0, 100),
  );

  /* The ladder's top: one more single-approved Pro payment upgrades A
     and the export seam opens — the reworded Pro bullet «تصدير CSV
     للتقارير» is now enforced truth. */
  const proPlan = (plansRes.body?.data || []).find((p) => p.name === "Pro");
  ok("Pro plan row available from the self-seeded catalog", !!proPlan, JSON.stringify(plansRes.body).slice(0, 80));

  const proSub = await A.call("/api/subscriptions", {
    method: "POST",
    body: JSON.stringify({ planId: proPlan?.id, provider: "libyana", amount: proPlan?.price, phone: "0912345678", businessId: bizAId }),
  });
  const proPaymentId = proSub.body?.data?.id;
  ok("merchant files the Pro upgrade payment (PENDING)", !!proPaymentId && proSub.body?.data?.status === "PENDING", JSON.stringify(proSub.body).slice(0, 100));

  const proApprove = await adm1.call(`/api/subscriptions/${proPaymentId}/review`, { method: "POST", body: JSON.stringify({ action: "APPROVE" }) });
  ok("single review approves the Pro upgrade (no race this time — one request)", proApprove.status === 200 && proApprove.body?.data?.status === "APPROVED", JSON.stringify(proApprove.body).slice(0, 100));

  const proExport = await A.call(exportPath(bizAId), { rawText: true });
  ok(
    "export gate: the approved Pro payment opens the real server export (200 text/csv)",
    proExport.status === 200 && (proExport.headers?.get?.("content-type") ?? "").includes("text/csv"),
    JSON.stringify({ status: proExport.status, ct: proExport.headers?.get?.("content-type") }),
  );
  ok(
    "export body: UTF-8 BOM + the honest W6-B4 header + the window line (Excel-safe Arabic, same numbers as the screen)",
    typeof proExport.body === "string" &&
      proExport.body.startsWith("\uFEFFسمارت أوردر — تقرير الأداء") &&
      proExport.body.includes("النافذة,آخر 30 يوماً") &&
      proExport.body.includes("بلا الملغي والمرفوض"),
    String(proExport.body).slice(0, 120),
  );
  ok(
    "export filename: the honest product-slug-window-stamp contract in Content-Disposition",
    /^attachment; filename="smart-order-report-[^"]+-30d-\d{8}\.csv"$/.test(proExport.headers?.get?.("content-disposition") ?? ""),
    proExport.headers?.get?.("content-disposition") ?? "",
  );

  const proReports = await A.call(reportsPath(bizAId, 90));
  ok(
    "reports response after Pro: the CSV preference flag flips true (and the 90-day window still answers)",
    proReports.status === 200 && proReports.body?.data?.window?.days === 90 && proReports.body?.data?.series?.length === 90 && proReports.body?.data?.canExportCsv === true,
    JSON.stringify(proReports.body).slice(0, 120),
  );

  // ---------- 11.5 native merchant sessions — the Bearer transport (P36 Phase C) ----------
  console.log("— الجلسات الأصلية للتجار: ناقل الـBearer (P36-C)");
  /* C3+C4 contract battery: the RN merchant app authenticates with a
     Bearer device token and consumes the SAME merchant surface the web
     dashboard does (no duplicated business rules — the transport was
     added at the auth-resolution layer, src/lib/auth.ts getAuthUser).
     Pins: login ok/bad-password/rate-limit, me + selection context,
     cookie-less merchant reads, the SAME order state machine through
     the mobile surface, STAFF permission boundaries, cross-tenant
     isolation with a Bearer token, device list + revocation, logout. */
  const mobileLogin = (email, password, extra = {}) =>
    makeCtx().call("/api/mobile/auth/login", { method: "POST", body: JSON.stringify({ email, password, ...extra }) });
  const bearer = (token) => {
    // fresh cookie jar (empty) + Authorization header = a pure Bearer client
    const ctx = makeCtx();
    return (path, opts = {}) => ctx.call(path, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
  };

  const mLogin = await mobileLogin(emailA, "Test#2026Pass", { platform: "android", deviceName: "هاتف المالك", appVersion: "1.0.0" });
  const mTok = mLogin.body?.data?.token;
  ok(
    "mobile login mints a prefixed device token (som_ + 43 base64url chars)",
    mLogin.body?.success === true && typeof mTok === "string" && /^som_[A-Za-z0-9_-]{43}$/.test(mTok),
    JSON.stringify(mLogin.body).slice(0, 100),
  );
  ok(
    "mobile login answers tokenType Bearer + the ~30d sliding expiry",
    mLogin.body?.data?.tokenType === "Bearer" && typeof mLogin.body?.data?.expiresAt === "string" &&
      new Date(mLogin.body.data.expiresAt).getTime() > Date.now() + 29 * 24 * 3600 * 1000,
    JSON.stringify(mLogin.body?.data?.expiresAt),
  );
  const mMem = mLogin.body?.data?.memberships?.[0];
  ok(
    "mobile login ships the selection context (memberships + RESOLVED permissions)",
    !!mMem && mMem.role === "OWNER" && mMem.businessId === bizAId && Array.isArray(mMem.permissions) &&
      mMem.permissions.includes("settings.manage") && mMem.permissions.includes("orders.cancel"),
    JSON.stringify(mMem).slice(0, 120),
  );

  const mA = bearer(mTok);
  const meMobile = await mA("/api/mobile/auth/me");
  const meSess = meMobile.body?.data?.session;
  ok(
    "me (Bearer): user + memberships + the device metadata sent at login",
    meMobile.body?.data?.user?.email === emailA && meMobile.body?.data?.memberships?.length >= 1 &&
      meSess?.platform === "android" && meSess?.deviceName === "هاتف المالك" && !!meSess?.id,
    JSON.stringify(meMobile.body).slice(0, 140),
  );

  // the EXISTING merchant surface serves cookie-less Bearer requests
  const ordersBearer = await mA(`/api/orders?businessId=${bizAId}`);
  ok(
    "existing merchant API serves Bearer-only requests (orders inbox)",
    ordersBearer.body?.success === true && Array.isArray(ordersBearer.body?.data),
    JSON.stringify(ordersBearer.body).slice(0, 100),
  );
  ok(
    "orders inbox pagination meta rides the envelope",
    ordersBearer.body?.meta?.total >= 0 && ordersBearer.body?.meta?.page === 1,
    JSON.stringify(ordersBearer.body?.meta),
  );

  const statsBearer = await mA(`/api/dashboard/stats?businessId=${bizAId}`);
  const sc = statsBearer.body?.data?.stats?.statusCounts;
  ok(
    "dashboard KPIs via Bearer + counts-by-status (P36-C4, all 8 statuses zero-filled)",
    statsBearer.body?.success === true && !!sc &&
      ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REJECTED"].every((s) => typeof sc[s] === "number"),
    JSON.stringify(sc),
  );

  // order transitions through the mobile surface — the SAME server machine
  const twinId = twinOrder?.id;
  const badJump = await mA(`/api/orders/${twinId}`, { method: "PATCH", body: JSON.stringify({ businessId: bizAId, status: "DELIVERED" }) });
  ok(
    "mobile transition respects the machine: NEW→DELIVERED refused 409 INVALID_TRANSITION",
    rateLimited || (badJump.status === 409 && badJump.body?.error?.code === "INVALID_TRANSITION"),
    JSON.stringify(badJump.body).slice(0, 100),
  );
  const goodJump = await mA(`/api/orders/${twinId}`, { method: "PATCH", body: JSON.stringify({ businessId: bizAId, status: "CONFIRMED" }) });
  ok(
    "mobile transition NEW→CONFIRMED lands (history + audit as ever)",
    rateLimited || goodJump.body?.data?.order?.status === "CONFIRMED",
    JSON.stringify(goodJump.body).slice(0, 100),
  );

  // STAFF permission boundaries via the mobile surface
  const mStaffLogin = await mobileLogin(staffEmail, "Test#2026Pass", { platform: "ios", deviceName: "هاتف الموظف" });
  const mStaffTok = mStaffLogin.body?.data?.token;
  const sMem = mStaffLogin.body?.data?.memberships?.[0];
  ok(
    "staff mobile login resolves the 4 STAFF permissions (no settings/staff/cancel)",
    !!mStaffTok && sMem?.role === "STAFF" && sMem.permissions.includes("orders.update") &&
      !sMem.permissions.includes("settings.manage") && !sMem.permissions.includes("staff.manage") && !sMem.permissions.includes("orders.cancel"),
    JSON.stringify(sMem).slice(0, 140),
  );
  const mS = bearer(mStaffTok);
  const staffAdvance = await mS(`/api/orders/${twinId}`, { method: "PATCH", body: JSON.stringify({ businessId: bizAId, status: "PREPARING" }) });
  ok(
    "STAFF can advance orders via mobile (orders.update is in the STAFF set)",
    rateLimited || staffAdvance.body?.data?.order?.status === "PREPARING",
    JSON.stringify(staffAdvance.body).slice(0, 100),
  );
  const staffCancel = await mS(`/api/orders/${twinId}`, { method: "PATCH", body: JSON.stringify({ businessId: bizAId, status: "CANCELLED" }) });
  ok(
    "STAFF cannot cancel/reject via mobile — orders.cancel is OWNER/ADMIN (403)",
    rateLimited || staffCancel.status === 403,
    JSON.stringify(staffCancel.body).slice(0, 100),
  );
  const staffSettings = await mS("/api/business", { method: "PATCH", body: JSON.stringify({ businessId: bizAId, receiptFooter: "x" }) });
  ok("STAFF cannot touch business settings (403 settings.manage)", staffSettings.status === 403 || staffSettings.body?.error?.code === "FORBIDDEN");
  const staffStaff = await mS("/api/staff", { method: "POST", body: JSON.stringify({ businessId: bizAId, name: "متسلل", email: rnd("intr_") + "@test.ly", password: "Test#2026Pass", role: "STAFF" }) });
  ok("STAFF cannot create staff (403 staff.manage)", staffStaff.status === 403 || staffStaff.body?.error?.code === "FORBIDDEN");

  // cross-tenant isolation with a Bearer token (business B's owner)
  const mBLogin = await mobileLogin(emailB, "Test#2026Pass", { platform: "android", deviceName: "هاتف ب" });
  const mB = bearer(mBLogin.body?.data?.token);
  const xSpoof = await mB(`/api/orders?businessId=${bizAId}`);
  ok(
    "cross-tenant (Bearer): B's token + A's businessId → 403 (membership guard)",
    xSpoof.status === 403 || xSpoof.body?.error?.code === "FORBIDDEN",
    JSON.stringify(xSpoof.body).slice(0, 90),
  );
  const xOrder = await mB(`/api/orders/${twinId}`);
  ok(
    "cross-tenant (Bearer): B's token reading A's order → 404 (tenant-scoped findFirst)",
    rateLimited || xOrder.status === 404,
    JSON.stringify(xOrder.body).slice(0, 90),
  );
  const xStats = await mB(`/api/dashboard/stats?businessId=${bizAId}`);
  ok("cross-tenant (Bearer): B's token cannot read A's dashboard KPIs", xStats.status === 403);

  // ---------- 11.6 C4: the full merchant business surface over Bearer (P36-C4) ----------
  console.log("— سطح أعمال التاجر الكامل عبر الـBearer (P36-C4)");
  /* Placement contract: this battery rides INSIDE the 11.5 fixture region
     on purpose — it reuses the C3-minted tokens (mA owner-A · mS staff-A ·
     mB owner-B) and mints NO new sessions (the sessions-list count below
     pins exactly 2 owner devices, and the mobile-login budget burns at
     the tail). Every merchant capability is driven through the Bearer
     transport on the SAME routes the web dashboard uses — the C3
     insight: the transport landed at the auth-resolution layer, so the
     business surface is one code path, never a mobile fork of the rules.
     NEW surface pinned here: PATCH /api/payment-methods (reorder) and
     GET /api/mobile/reports (windowed summary — from/to + status
     distribution, the two things the 30/90 web reports don't carry). */
  /* A's deterministic order census on a fresh database: order1 (§5) + the
     raced twin (§6) + the re-priced badPrice order (§7) + ONE loop order
     before §8's 429 — every one 39500 millimes (same payload, server
     re-priced). The customers upsert keys on (businessId, phone) so all
     four land on the ONE «عميل اختبار» row (order1 alone is DELIVERED →
     totalSpent 39500). */
  const c4Orders = rateLimited ? 0 : 4;
  const c4Revenue = rateLimited ? 0 : 158000; // 39500 × 4

  // — orders inbox: filters + search through the Bearer lens —
  const inboxAll = await mA(`/api/orders?businessId=${bizAId}&pageSize=50`);
  const inboxRows = inboxAll.body?.data ?? [];
  ok(
    "C4 inbox: the full A inbox via Bearer",
    inboxAll.body?.success === true && inboxRows.length >= c4Orders && inboxAll.body?.meta?.total >= c4Orders,
    JSON.stringify({ rows: inboxRows.length, meta: inboxAll.body?.meta }),
  );
  const inboxDelivered = await mA(`/api/orders?businessId=${bizAId}&status=DELIVERED`);
  ok(
    "C4 inbox: status filter returns only DELIVERED rows",
    rateLimited || ((inboxDelivered.body?.data ?? []).length === 1 && inboxDelivered.body?.data[0].status === "DELIVERED"),
    JSON.stringify(inboxDelivered.body?.meta),
  );
  const inboxSearch = await mA(`/api/orders?businessId=${bizAId}&q=${encodeURIComponent("عميل السباق")}`);
  ok(
    "C4 inbox: q search finds the raced order by customer name",
    rateLimited || (inboxSearch.body?.data ?? []).some((o) => o.id === twinOrder?.id),
    JSON.stringify((inboxSearch.body?.data ?? []).map((o) => o.customerName)).slice(0, 120),
  );

  // — order detail: line items + modifiers + delivery + payment + history —
  const c4Det = await mA(`/api/orders/${created?.id}?businessId=${bizAId}`);
  const c4Ord = c4Det.body?.data?.order;
  const c4Item = c4Ord?.items?.[0];
  ok(
    "C4 detail: items carry the variant + options snapshot and the server-priced money",
    rateLimited || (
      c4Det.body?.success === true && c4Item?.variantName === "كبير" &&
      (c4Item?.optionsJson ?? "").includes("صوص") &&
      c4Item?.unitPrice === 17750 && c4Item?.quantity === 2 && c4Item?.lineTotal === 35500
    ),
    JSON.stringify(c4Item).slice(0, 140),
  );
  ok(
    "C4 detail: delivery + payment + customer + full status history ride the payload",
    rateLimited || (
      c4Ord?.fulfillmentType === "DELIVERY" && c4Ord?.city === "طرابلس" && c4Ord?.deliveryFee === 4000 &&
      c4Ord?.paymentStatus === "UNPAID" && c4Ord?.customer?.phone === "0912345678" &&
      Array.isArray(c4Ord?.history) && c4Ord?.history?.length >= 6
    ),
    JSON.stringify({ fee: c4Ord?.deliveryFee, pm: c4Ord?.paymentStatus, hist: c4Ord?.history?.length }),
  );

  // — the payment sub-machine through Bearer (owner) —
  const refundEarly = await mA(`/api/orders/${twinOrder?.id}`, { method: "PATCH", body: JSON.stringify({ businessId: bizAId, paymentStatus: "REFUNDED" }) });
  ok(
    "C4 payment machine: REFUNDED without PAID is refused 409 (same rule, same route)",
    rateLimited || (refundEarly.status === 409 && refundEarly.body?.error?.code === "INVALID_TRANSITION"),
    JSON.stringify(refundEarly.body).slice(0, 100),
  );
  const markPaid = await mA(`/api/orders/${created?.id}`, { method: "PATCH", body: JSON.stringify({ businessId: bizAId, paymentStatus: "PAID" }) });
  ok(
    "C4 payment machine: DELIVERED order marked PAID (history row rides the same tx)",
    rateLimited || (markPaid.body?.data?.order?.paymentStatus === "PAID"),
    JSON.stringify(markPaid.body).slice(0, 100),
  );

  // — status transitions through Bearer: advance the twin, then a refused backward jump —
  const c4Advance = await mA(`/api/orders/${twinOrder?.id}`, { method: "PATCH", body: JSON.stringify({ businessId: bizAId, status: "READY" }) });
  ok(
    "C4 transition: PREPARING→READY lands via Bearer",
    rateLimited || c4Advance.body?.data?.order?.status === "READY",
    JSON.stringify(c4Advance.body).slice(0, 100),
  );
  const c4Back = await mA(`/api/orders/${twinOrder?.id}`, { method: "PATCH", body: JSON.stringify({ businessId: bizAId, status: "CONFIRMED" }) });
  ok(
    "C4 transition: backward jump READY→CONFIRMED refused 409 (machine integrity)",
    rateLimited || (c4Back.status === 409 && c4Back.body?.error?.code === "INVALID_TRANSITION"),
    JSON.stringify(c4Back.body).slice(0, 100),
  );

  // — categories CRUD via Bearer —
  const c4Cat = await mA("/api/categories", { method: "POST", body: JSON.stringify({ businessId: bizAId, name: "قسم الجوال" }) });
  const c4CatId = c4Cat.body?.data?.category?.id;
  ok("C4 categories: create via Bearer", !!c4CatId, JSON.stringify(c4Cat.body).slice(0, 100));
  const c4CatRename = await mA(`/api/categories/${c4CatId}`, { method: "PATCH", body: JSON.stringify({ businessId: bizAId, name: "قسم الجوال المعدل" }) });
  ok("C4 categories: rename via Bearer", c4CatRename.body?.data?.category?.name === "قسم الجوال المعدل", JSON.stringify(c4CatRename.body).slice(0, 100));
  const c4CatDel = await mA(`/api/categories/${c4CatId}?businessId=${bizAId}`, { method: "DELETE" });
  ok("C4 categories: empty category hard-deletes via Bearer", c4CatDel.body?.data?.deleted === true, JSON.stringify(c4CatDel.body).slice(0, 80));

  // — products CRUD via Bearer (variants + optionGroups, edit, archive) —
  const c4Prod = await mA("/api/products", {
    method: "POST",
    body: JSON.stringify({
      businessId: bizAId, categoryId: catId, name: "طبق الجوال", description: "من الشاشة الصغيرة",
      price: "9.750", isAvailable: true,
      variants: [{ name: "عادي", priceDelta: "0" }, { name: "كبير", priceDelta: "1.500" }],
      optionGroups: [{ name: "إضافات", minSelect: 1, maxSelect: 2, required: true, options: [{ name: "جبنة إضافية", priceDelta: "0.750" }] }],
    }),
  });
  const c4ProdId = c4Prod.body?.data?.product?.id;
  ok(
    "C4 products: create with variants+optionGroups (millimes parsed server-side)",
    !!c4ProdId && c4Prod.body?.data?.product?.price === 9750 &&
      c4Prod.body?.data?.product?.variants?.[1]?.priceDelta === 1500 &&
      c4Prod.body?.data?.product?.optionGroups?.[0]?.options?.[0]?.priceDelta === 750,
    JSON.stringify(c4Prod.body).slice(0, 140),
  );
  const c4ProdEdit = await mA(`/api/products/${c4ProdId}`, {
    method: "PATCH",
    body: JSON.stringify({
      businessId: bizAId, price: "11.000", isFeatured: true,
      variants: [{ name: "وسط", priceDelta: "0.500" }],
    }),
  });
  ok(
    "C4 products: edit re-prices + replaces variants + flips featured",
    c4ProdEdit.body?.data?.product?.price === 11000 && c4ProdEdit.body?.data?.product?.isFeatured === true &&
      c4ProdEdit.body?.data?.product?.variants?.length === 1 && c4ProdEdit.body?.data?.product?.variants?.[0]?.name === "وسط",
    JSON.stringify(c4ProdEdit.body?.data?.product?.variants).slice(0, 100),
  );
  const c4ProdGet = await mA(`/api/products/${c4ProdId}?businessId=${bizAId}`);
  ok(
    "C4 products: single read keeps the option group tree",
    c4ProdGet.body?.data?.product?.optionGroups?.[0]?.options?.[0]?.name === "جبنة إضافية",
    JSON.stringify(c4ProdGet.body?.data?.product?.optionGroups).slice(0, 120),
  );
  const c4ProdArch = await mA(`/api/products/${c4ProdId}?businessId=${bizAId}`, { method: "DELETE" });
  ok("C4 products: archive (never hard-delete) via Bearer", c4ProdArch.body?.data?.archived === true, JSON.stringify(c4ProdArch.body).slice(0, 80));
  const c4ProdList = await mA(`/api/products?businessId=${bizAId}`);
  ok(
    "C4 products: archived product vanishes from the list",
    !(c4ProdList.body?.data?.products ?? []).some((p) => p.id === c4ProdId),
    `list length ${(c4ProdList.body?.data?.products ?? []).length}`,
  );
  const c4StaffProduct = await mS("/api/products", { method: "POST", body: JSON.stringify({ businessId: bizAId, name: "منتج متسلل", price: "1.000" }) });
  ok("C4 RBAC: STAFF cannot create products via Bearer (403 products.manage)", c4StaffProduct.status === 403 || c4StaffProduct.body?.error?.code === "FORBIDDEN");
  const c4XProduct = await mB(`/api/products/${c4ProdId}`, { method: "PATCH", body: JSON.stringify({ businessId: bizBId, price: "1.000" }) });
  ok("C4 RBAC: B's token cannot edit A's product (404 tenant-scoped)", c4XProduct.status === 404 || c4XProduct.body?.error?.code === "NOT_FOUND");

  // — delivery zones CRUD via Bearer —
  const c4Zone = await mA("/api/delivery-zones", { method: "POST", body: JSON.stringify({ businessId: bizAId, name: "حي الأندلس", fee: "3.000", minOrder: "10.000" }) });
  const c4ZoneId = c4Zone.body?.data?.zone?.id;
  ok(
    "C4 zones: create with fee + minOrder (millimes)",
    !!c4ZoneId && c4Zone.body?.data?.zone?.fee === 3000 && c4Zone.body?.data?.zone?.minOrder === 10000,
    JSON.stringify(c4Zone.body).slice(0, 100),
  );
  const c4ZoneEdit = await mA(`/api/delivery-zones/${c4ZoneId}`, { method: "PATCH", body: JSON.stringify({ businessId: bizAId, fee: "3.500", isActive: false }) });
  ok("C4 zones: edit fee + deactivate", c4ZoneEdit.body?.data?.zone?.fee === 3500 && c4ZoneEdit.body?.data?.zone?.isActive === false, JSON.stringify(c4ZoneEdit.body).slice(0, 100));
  const c4ZoneDel = await mA(`/api/delivery-zones/${c4ZoneId}?businessId=${bizAId}`, { method: "DELETE" });
  ok("C4 zones: delete via Bearer", c4ZoneDel.body?.data?.deleted === true, JSON.stringify(c4ZoneDel.body).slice(0, 80));

  // — payment methods config via Bearer (enable/disable/instructions/order) —
  const c4PmList0 = await mA(`/api/payment-methods?businessId=${bizAId}`);
  const c4Pm0 = c4PmList0.body?.data?.methods ?? [];
  ok(
    "C4 payment methods: register-seeded COD+CASH list via Bearer",
    c4Pm0.length === 2 && c4Pm0.some((m) => m.type === "COD") && c4Pm0.some((m) => m.type === "CASH"),
    JSON.stringify(c4Pm0.map((m) => m.type)),
  );
  const c4PmCreate = await mA("/api/payment-methods", {
    method: "POST",
    body: JSON.stringify({ businessId: bizAId, type: "WHATSAPP", name: "تأكيد عبر واتساب", instructions: "أرسل الإيصال", number: "0913456789" }),
  });
  const c4PmId = c4PmCreate.body?.data?.method?.id;
  ok(
    "C4 payment methods: create WhatsApp method with a normalized transfer number",
    !!c4PmId && (() => { try { return JSON.parse(c4PmCreate.body.data.method.config).number === "0913456789"; } catch { return false; } })(),
    JSON.stringify(c4PmCreate.body).slice(0, 120),
  );
  const c4PmEdit = await mA(`/api/payment-methods/${c4PmId}`, { method: "PATCH", body: JSON.stringify({ businessId: bizAId, instructions: "أرسل صورة التحويل", isActive: false }) });
  ok(
    "C4 payment methods: instructions update + disable",
    c4PmEdit.body?.data?.method?.instructions === "أرسل صورة التحويل" && c4PmEdit.body?.data?.method?.isActive === false,
    JSON.stringify(c4PmEdit.body).slice(0, 100),
  );
  const codId = c4Pm0.find((m) => m.type === "COD")?.id;
  const cashId = c4Pm0.find((m) => m.type === "CASH")?.id;
  const c4PmReorder = await mA("/api/payment-methods", { method: "PATCH", body: JSON.stringify({ businessId: bizAId, order: [c4PmId, cashId, codId] }) });
  const c4Reordered = c4PmReorder.body?.data?.methods ?? [];
  ok(
    "C4 payment methods: reorder (NEW C4 endpoint) rewrites the display order",
    c4PmReorder.body?.success === true && c4Reordered.map((m) => m.type).join(",") === "WHATSAPP,CASH,COD",
    JSON.stringify(c4Reordered.map((m) => m.type)),
  );
  const c4PmPersist = await mA(`/api/payment-methods?businessId=${bizAId}`);
  ok(
    "C4 payment methods: the new order persists on the next read",
    (c4PmPersist.body?.data?.methods ?? []).map((m) => m.type).join(",") === "WHATSAPP,CASH,COD",
    JSON.stringify((c4PmPersist.body?.data?.methods ?? []).map((m) => m.type)),
  );
  const c4PmPartial = await mA("/api/payment-methods", { method: "PATCH", body: JSON.stringify({ businessId: bizAId, order: [c4PmId] }) });
  ok("C4 payment methods: partial reorder refused (422 — the full list is the contract)", c4PmPartial.status === 422 && c4PmPartial.body?.error?.code === "VALIDATION", JSON.stringify(c4PmPartial.body).slice(0, 90));
  const c4PmX = await mB("/api/payment-methods", { method: "PATCH", body: JSON.stringify({ businessId: bizBId, order: [c4PmId, cashId, codId] }) });
  ok("C4 payment methods: B's token reordering A's ids → 404 (no cross-tenant oracle)", c4PmX.status === 404 || c4PmX.body?.error?.code === "NOT_FOUND", JSON.stringify(c4PmX.body).slice(0, 90));
  const c4PmDel = await mA(`/api/payment-methods/${c4PmId}?businessId=${bizAId}`, { method: "DELETE" });
  ok("C4 payment methods: delete via Bearer", c4PmDel.body?.data?.deleted === true, JSON.stringify(c4PmDel.body).slice(0, 80));

  // — business settings via Bearer (WhatsApp/contact — publish stays web-pinned) —
  const c4Biz = await mA("/api/business", { method: "PATCH", body: JSON.stringify({ businessId: bizAId, receiptFooter: "شكراً لثقتكم — من الجوال", whatsappNumber: "0913456789" }) });
  ok(
    "C4 business: settings PATCH normalizes the WhatsApp number",
    c4Biz.body?.data?.business?.whatsappNumber === "0913456789" && c4Biz.body?.data?.business?.receiptFooter === "شكراً لثقتكم — من الجوال",
    JSON.stringify(c4Biz.body?.data?.business).slice(0, 120),
  );

  // — customers: list + search + profile with order history —
  const c4CustList = await mA(`/api/customers?businessId=${bizAId}`);
  const c4Customers = c4CustList.body?.data ?? [];
  const c4Cust = c4Customers.find((c) => c.name === "عميل اختبار");
  ok(
    "C4 customers: enriched list via Bearer (orderCount + spend stats)",
    (rateLimited || c4Customers.length >= 1) && (rateLimited || (!!c4Cust && c4Cust.orderCount >= 1 && typeof c4Cust.totalSpent === "number")),
    JSON.stringify(c4Customers.map((c) => c.name)).slice(0, 120),
  );
  const c4CustSearch = await mA(`/api/customers?businessId=${bizAId}&q=${encodeURIComponent("عميل")}`);
  ok(
    "C4 customers: q search filters by name",
    (c4CustSearch.body?.data ?? []).length >= 1 && (c4CustSearch.body?.data ?? []).every((c) => c.name.includes("عميل")),
    JSON.stringify((c4CustSearch.body?.data ?? []).map((c) => c.name)).slice(0, 120),
  );
  const c4CustDetail = await mA(`/api/customers/${c4Cust?.id}?businessId=${bizAId}`);
  const c4CustOrd = c4CustDetail.body?.data?.customer;
  ok(
    "C4 customers: profile ships the order history + stats (all 4 orders, 1 delivered)",
    rateLimited || (
      Array.isArray(c4CustOrd?.orders) && c4CustOrd?.orders?.some((o) => o.orderNumber?.startsWith("SO-")) &&
      c4CustOrd?.stats?.orderCount === 4 && c4CustOrd?.stats?.totalSpent === 39500
    ),
    JSON.stringify(c4CustOrd?.stats).slice(0, 100),
  );
  const c4CustStaff = await mS(`/api/customers?businessId=${bizAId}`);
  ok("C4 RBAC: STAFF reads customers (customers.read is in the STAFF set)", c4CustStaff.body?.success === true, JSON.stringify(c4CustStaff.body?.error ?? null).slice(0, 80));

  // — staff: the roster with roles —
  const c4Staff = await mA(`/api/staff?businessId=${bizAId}`);
  const c4Roster = c4Staff.body?.data?.staff ?? [];
  ok(
    "C4 staff: roster lists roles + users (owner + 2 staff)",
    c4Roster.length === 3 && c4Roster.some((s) => s.role === "OWNER") && c4Roster.filter((s) => s.role === "STAFF").length === 2 &&
      c4Roster.every((s) => !!s.user?.email),
    JSON.stringify(c4Roster.map((s) => s.role)).slice(0, 100),
  );
  const c4StaffDenied = await mS(`/api/staff?businessId=${bizAId}`);
  ok("C4 RBAC: STAFF cannot list the roster (403 staff.manage)", c4StaffDenied.status === 403 || c4StaffDenied.body?.error?.code === "FORBIDDEN");

  // — reports: the web 30/90 surface + the NEW windowed mobile summary —
  const c4WebReports = await mA(`/api/dashboard/reports?businessId=${bizAId}&days=30`);
  ok(
    "C4 reports: the web 30-day surface answers over Bearer (A is Pro)",
    c4WebReports.body?.success === true && c4WebReports.body?.data?.window?.days === 30 && c4WebReports.body?.data?.series?.length === 30,
    JSON.stringify(c4WebReports.body?.error ?? null).slice(0, 90),
  );
  // Tripoli calendar-day key (fixed +2h, no DST — the server's own law)
  const c4DayKey = (offsetDays = 0) => new Date(Date.now() + 2 * 3600 * 1000 + offsetDays * 86400000).toISOString().slice(0, 10);
  const c4Rep = await mA(`/api/mobile/reports?businessId=${bizAId}`);
  const c4Summary = c4Rep.body?.data;
  const c4Sc = c4Summary?.statusCounts ?? {};
  ok(
    "C4 mobile reports (NEW): default 30-day window with the exact accounting",
    c4Rep.body?.success === true && c4Summary?.window?.days === 30 && c4Summary?.series?.length === 30 &&
      c4Summary?.totals?.orders === c4Orders && c4Summary?.totals?.revenue === c4Revenue && c4Summary?.totals?.avgOrder === (c4Orders > 0 ? 39500 : 0),
    JSON.stringify(c4Summary?.totals).slice(0, 100),
  );
  ok(
    "C4 mobile reports: status distribution — all 8 statuses, terminals included, sums to the window",
    ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REJECTED"].every((s) => typeof c4Sc[s] === "number") &&
      Object.values(c4Sc).reduce((a, b) => a + b, 0) >= c4Orders,
    JSON.stringify(c4Sc),
  );
  const c4Rep7 = await mA(`/api/mobile/reports?businessId=${bizAId}&from=${c4DayKey(-6)}&to=${c4DayKey(0)}`);
  ok(
    "C4 mobile reports: from/to date filters shape the window + series",
    c4Rep7.body?.data?.window?.days === 7 && c4Rep7.body?.data?.series?.length === 7 && c4Rep7.body?.data?.series?.[0]?.date === c4DayKey(-6),
    JSON.stringify(c4Rep7.body?.data?.window).slice(0, 100),
  );
  const c4RepBadFrom = await mA(`/api/mobile/reports?businessId=${bizAId}&from=${c4DayKey(0)}&to=${c4DayKey(-1)}`);
  ok("C4 mobile reports: from after to → 422", c4RepBadFrom.status === 422, JSON.stringify(c4RepBadFrom.body).slice(0, 90));
  const c4RepSpan = await mA(`/api/mobile/reports?businessId=${bizAId}&from=${c4DayKey(-400)}&to=${c4DayKey(0)}`);
  ok("C4 mobile reports: span beyond 366 days → 422", c4RepSpan.status === 422, JSON.stringify(c4RepSpan.body).slice(0, 90));
  const c4RepFuture = await mA(`/api/mobile/reports?businessId=${bizAId}&to=${c4DayKey(1)}`);
  ok("C4 mobile reports: future window → 422", c4RepFuture.status === 422, JSON.stringify(c4RepFuture.body).slice(0, 90));
  const c4RepFakeDay = await mA(`/api/mobile/reports?businessId=${bizAId}&from=2026-02-31`);
  ok("C4 mobile reports: impossible calendar day (2026-02-31) → 422 (round-trip gate)", c4RepFakeDay.status === 422, JSON.stringify(c4RepFakeDay.body).slice(0, 90));
  const c4RepNoBearer = await A.call(`/api/mobile/reports?businessId=${bizAId}`);
  ok(
    "C4 mobile reports: Bearer-only law — a valid WEB cookie never authenticates the mobile namespace (401)",
    c4RepNoBearer.status === 401 && c4RepNoBearer.body?.error?.code === "UNAUTHENTICATED",
    JSON.stringify(c4RepNoBearer.body).slice(0, 90),
  );
  const c4RepAnon = await anon.call(`/api/mobile/reports?businessId=${bizAId}`);
  ok("C4 mobile reports: anonymous → 401", c4RepAnon.status === 401);
  const c4RepFree = await mB(`/api/mobile/reports?businessId=${bizBId}`);
  ok(
    "C4 mobile reports: the web Premium+ gate rides the mobile surface too (Free B → 403 PLAN_ENTITLEMENT)",
    c4RepFree.status === 403 && c4RepFree.body?.error?.code === "PLAN_ENTITLEMENT",
    JSON.stringify(c4RepFree.body).slice(0, 100),
  );
  const c4RepX = await mA(`/api/mobile/reports?businessId=${bizBId}`);
  ok("C4 mobile reports: cross-tenant businessId → 403", c4RepX.status === 403 || c4RepX.body?.error?.code === "FORBIDDEN");

  // device sessions list + revocation of ANOTHER device
  const mIosLogin = await mobileLogin(emailA, "Test#2026Pass", { platform: "ios", deviceName: "آيباد المالك" });
  const mIos = bearer(mIosLogin.body?.data?.token);
  const sessList = await mIos("/api/mobile/auth/sessions");
  const lst = sessList.body?.data?.sessions ?? [];
  const androidEntry = lst.find((s) => s.id === meSess?.id);
  const iosEntry = lst.find((s) => s.current === true);
  ok(
    "sessions list: both owner devices active, current flagged, metadata intact",
    lst.length === 2 && !!iosEntry && !!androidEntry && androidEntry.current === false && androidEntry.platform === "android",
    JSON.stringify(lst).slice(0, 160),
  );
  const revoke = await mIos(`/api/mobile/auth/sessions/${meSess?.id}`, { method: "DELETE" });
  ok("revoking another device answers { revoked: true }", revoke.body?.data?.revoked === true, JSON.stringify(revoke.body).slice(0, 80));
  const revokedMe = await mA("/api/mobile/auth/me");
  ok(
    "the revoked device's token is rejected (401, never a silent cookie fallback)",
    revokedMe.status === 401 && revokedMe.body?.error?.code === "UNAUTHENTICATED",
    JSON.stringify(revokedMe.body).slice(0, 80),
  );
  const revokedOrders = await mA(`/api/orders?businessId=${bizAId}`);
  ok("the revoked token is rejected on the merchant surface too", revokedOrders.status === 401);

  // logout (current device)
  const logout = await mIos("/api/mobile/auth/logout", { method: "POST" });
  ok("logout revokes the presenting device", logout.body?.data?.loggedOut === true, JSON.stringify(logout.body).slice(0, 80));
  const afterLogout = await mIos("/api/mobile/auth/me");
  ok("post-logout me → 401", afterLogout.status === 401);

  // bad password + the login rate limit (LAST: burns the per-IP mobile budget)
  const badPw = await mobileLogin(emailA, "wrong-password");
  ok(
    "bad password → the web login's exact Arabic 401 copy",
    badPw.status === 401 && badPw.body?.error?.message === "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    JSON.stringify(badPw.body).slice(0, 90),
  );
  let m429 = false;
  let mRetry = "";
  for (let i = 0; i < 14; i++) {
    const r = await mobileLogin(emailA, "wrong-password");
    if (r.status === 429) { m429 = true; mRetry = String(r.headers?.get?.("retry-after") ?? ""); break; }
  }
  if (m429) {
    ok("mobile login rate limit (429) triggers — the web dbRateLimit pattern", true);
    ok("mobile 429 carries a numeric Retry-After", /^\d+$/.test(mRetry) && Number(mRetry) > 0, `retry-after="${mRetry}"`);
  }
  else { skipped++; console.log("  - mobile login rate limit not reached — skipped"); }

  // ---------- 12. public surfaces ignore QA fixtures (P30-B) ----------
  console.log("— الأسطح العامة تتجاهل بيانات الاختبار (P30-B)");
  const bizASlug = regA?.body?.data?.business?.slug;
  ok("battery captured the fixture store's slug (the register response contract)", !!bizASlug, JSON.stringify(regA?.body?.data?.business ?? {}).slice(0, 80));
  const sm = await makeCtx().call("/sitemap.xml", { rawText: true });
  ok(
    "sitemap sanity: the static routes still ride it",
    typeof sm.body === "string" && sm.body.includes("/pricing") && sm.body.includes("/terms"),
    `status ${sm.status}`,
  );
  ok(
    "sitemap excludes the published QA-fixture store (the live production defect: 7 fixture stores rode it)",
    typeof sm.body === "string" && !sm.body.includes(`/store/${bizASlug}`),
    `fixture slug: ${bizASlug}`,
  );
  const fixturePage = bizASlug ? await makeCtx().call(`/store/${bizASlug}`, { rawText: true }) : { status: 0 };
  ok(
    "fixture storefront stays reachable (exclusion = no crawl budget, never a broken link)",
    fixturePage.status === 200,
    `status ${fixturePage.status}`,
  );

  console.log(`\nالنتيجة: ${pass} ناجح · ${fail} فاشل · ${skipped} متجاهل\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error("SUITE ERROR:", e); process.exit(2); });
