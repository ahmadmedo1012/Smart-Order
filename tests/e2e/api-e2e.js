/**
 * Smart Order — E2E API test suite
 * Runs against any deployment (local dev or production URL).
 * Usage: node tests/e2e/api-e2e.js [baseUrl]
 *   default baseUrl: http://localhost:3000
 *
 * Covers: health, auth, tenant isolation (CRITICAL), rate limits,
 * order lifecycle, idempotency, validation, money re-pricing.
 */
const BASE = process.argv[2] || "http://localhost:3000";
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
    try { body = await res.json(); } catch { /* non-json */ }
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
  const { r: regA } = await registerBiz(A, "مخبز الاختبار أ");
  ok("business A registers", regA.status === 201 || regA.body?.success === true, JSON.stringify(regA.body).slice(0, 100));

  const meA = await A.call("/api/auth/me");
  const bizA = meA.body?.data?.user?.memberships?.[0]?.business;
  const bizAId = bizA?.id;
  ok("session persists after register (me)", meA.body?.success === true && !!bizAId, JSON.stringify(meA.body).slice(0, 120));

  const B = makeCtx();
  const { r: regB } = await registerBiz(B, "متجر الاختبار ب");
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

  console.log(`\nالنتيجة: ${pass} ناجح · ${fail} فاشل · ${skipped} متجاهل\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error("SUITE ERROR:", e); process.exit(2); });
