# الأمان | Security Policy

> سياسة إفصاح مسؤول واحدة لكل مشاريع منظومة مدارك.
> One responsible-disclosure policy for the whole Madarek ecosystem.

## النسخ المدعومة | Supported Versions

| الفرع | Branch | الحالة | Status |
|---|---|---|---|
| `main` | `main` | ✅ مدعوم | supported |

## الإبلاغ عن ثغرة | Reporting a Vulnerability

**عربي —** لا تفتح Issue عامًا للثغرات الأمنية أبدًا. أرسل التفاصيل **بشكل خاص** إلى
`ahmadmedo1012@gmail.com` (المشرف: أحمد مدو)، أو عبر خاصية «الإبلاغ الخاص عن الثغرات»
(Private vulnerability reporting) في إعدادات المستودع فور تفعيلها. أرفق وصفًا للثغرة،
خطوات إعادة الإنتاج، والأثر المتوقع. زمن الرد المستهدف: ٧٢ ساعة.

**English —** Never open a public issue for a security vulnerability. Report
**privately** to `ahmadmedo1012@gmail.com` (maintainer: Ahmad Medo), or via the
repository's Private vulnerability reporting once enabled in settings. Include
a description, reproduction steps, and expected impact. Target response: 72h.

## النطاق | Scope

**داخل النطاق | In scope** — التطبيقات الخمسة للمنظومة (مدارك، سمارت لينك،
سمارت منيو، سمارت بوت، سمارت أوردر) وجميع مساراتها: كل واجهات `/api`، المصادقة
والجلسات، المدفوعات وخطوط المال، الـ Webhooks (ماسنجر/تيليجرام)، عزل المستأجرين
(tenant isolation)، وقواعد البيانات ومعالجة البيانات الشخصية.

The five ecosystem apps (madarek, Smart-Link, Smart-Menu, SmartBot,
Smart-Order): all `/api` routes, auth & sessions, payments & money paths,
Messenger/Telegram webhooks, tenant isolation, data storage & PII handling.

**خارج النطاق | Out of scope** — هجمات حجب الخدمة، الهندسة الاجتماعية، التقارير
الآلية بلا إثبات عملي، والثغرات في نسخ معدَّلة غير منشورة. | DoS, social
engineering, automated scanner reports without a working PoC, and modified
deployments.

## وضع الأمان الحالي | Current posture

| المستودع / Repo | CSP | تحديد المعدل / Rate limit | فحص الأسرار / Secret scan |
|---|---|---|---|
| مدارك / madarek | ✓ helmet + فحص هاش | ✓ وسيط الخلفية | — |
| سمارت منيو / Smart-Menu | — | ✓ قاعدي (DB) | ✓ CI |
| سمارت لينك / Smart-Link | ✓ قائمة سماح | ✓ مسار الاتصال | — |
| سمارت بوت / SmartBot | ✓ middleware | ✓ FastAPI | ✓ CI |
| سمارت أوردر / Smart-Order | — | ✓ (+ e2e) | — |

ملفات `.env` غير متتبَّعة في كل المستودعات الخمسة. | `.env` files are untracked
in all five repositories.

## الإفصاح | Disclosure

إفصاح منسق بعد الإصلاح والتحقق — لا يُنشر شيء قبل الترقيع. | Coordinated
disclosure after the fix is verified — nothing goes public before the patch.
المبلّغون الجديّرون يُذكرون في `CHANGELOG.md`. | Creditable reporters are
acknowledged in `CHANGELOG.md`.

## سياسة شدة ثغرات التبعيات | Dependency vulnerability severity policy

> P38 — هذه السياسة تُنفَّذ آليًا في CI لهذا المستودع (`bun audit
> --audit-level=high` + `node scripts/dependency-audit-report.mjs`)،
> وتوثّق كيف يُتعامل مع كل شدة من شدات ثغرات التبعيات.

**English —** This policy is enforced automatically in CI for this repository
(`bun audit --audit-level=high` + `node scripts/dependency-audit-report.mjs`)
and defines how dependency-vulnerability findings of every severity are
handled:

| Severity | CI behavior | Required action |
|---|---|---|
| **Critical / High** | **Fails immediately.** Both the `--audit-level=high` gate and the report script hard-fail. | Fix at the root: bump the direct dependency, add/raise a documented override in `package.json`, or remove the vulnerable path. Acceptance is not an option. |
| **Moderate** | **Fails until triaged.** The report script fails on any moderate finding that has no unexpired acceptance entry in `docs/security/accepted-moderate.json`. | Fix-first. If a fix is genuinely unreachable now (e.g. the patched line is a major that breaks the toolchain), document an acceptance: `{ package, advisory, decision ≥ 20 chars, expiry ISO date }` in the ledger. Expired acceptances fail CI until fixed or renewed. |
| **Low** | **Always visible, never blocking.** The report prints every low finding on every run (`--audit-level=low` — nothing is filtered from the report). | Remediation tracked opportunistically; a low finding may never be hidden from the report. |

**عربي —** تُنفَّذ هذه السياسة آليًا في CI لهذا المستودع:

| الشدة | سلوك CI | الإجراء المطلوب |
|---|---|---|
| **Critical / High** | **كسر فوري للدفعة** (بوابة `--audit-level=high` + سكربت التقرير). | إصلاح من الجذر: ترقية التبعية المباشرة، أو override موثّق في `package.json`، أو إزالة المسار المصاب. القبول غير متاح إطلاقًا. |
| **Moderate** | **كسر حتى يُفرز.** السكربت يكسر على أي moderate بلا قبول ساري في `docs/security/accepted-moderate.json`. | fix-first. إن كان الإصلاح غير متاح فعلًا الآن (مثلًا النسخة المرقّعة major يكسر سلسلة الأدوات)، يُوثّق قبول `{package, advisory, decision ≥ 20 حرفًا, expiry تاريخ ISO}` في السجل. القبول المنتهي يكسر CI حتى يُصلَح أو يُجدَّد. |
| **Low** | **مرئي دائمًا، لا يكسر أبدًا.** التقرير يطبع كل low في كل تشغيل بلا تصفية. | تُتابع المعالجة عند التمكن؛ لا يجوز إخفاء low من التقرير أبدًا. |

**عقيدة الصدق | Honesty contract** — التقرير لا يطبع «صفر ثغرات» أبدًا
إلا وقد فحص الشجرتين (كاملة + إنتاج) بأدنى عتبة (`--audit-level=low`)
وطبع الجدول الكامل: أي تصفية للشدات الأدنى في سير العمل تعتبر خفضًا
صامتًا للعتبة ومخالفة لهذه السياسة. | The report never prints "zero
findings" unless it scanned BOTH trees (full + production) at the LOWEST
threshold and printed the complete table: filtering lower severities out of
the workflow is treated as silently lowering the threshold and violates
this policy.
