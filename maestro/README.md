# Smart-Order Maestro E2E — README (P38 Phase L)

## What's here

| Flow | File | Journey |
|---|---|---|
| Customer | `customer-order.yaml` | Home → store code → storefront → product → cart → required fields → submit → tracking |
| Merchant | `merchant-journey.yaml` | Login → order inbox → 8-status filter family (incl. the P38 «مرفوضة» chip) → More tab (notifications value copy) → logout |

Every selector is grounded in the real screen text/accessibility labels
pinned at commit `636278f` (see the YAML header comments for the exact
source lines). No invented selectors.

## Running (needs a real device or emulator — NOT runnable in the P38 sandbox)

```bash
# 1. Install a build that matches this source tree:
#    EAS «preview» profile APK (order.smart-link.ly family)
adb install smart-order-preview.apk

# 2. Export the QA secrets (never commit them):
export QA_STORE_SLUG=family-kitchen          # QA store with live products
export QA_CUSTOMER_NAME="اختبار مایسترو"
export QA_CUSTOMER_PHONE="0910000000"
export QA_MERCHANT_EMAIL=...                  # QA merchant on the SAME backend
export QA_MERCHANT_PASSWORD=...

# 3. Run:
maestro test maestro/
```

## The honest blocker

The P38 authoring sandbox has **no Android emulator (no KVM), no adb, no
USB device, and no macOS/Xcode** — the same environment limit documented
since P35. These flows were therefore **authored but not executed** here.
They are ready to run on any real device; if a selector drifted since
`636278f`, fix it in the flow file (the YAML comments cite the source
line of every label).

## QA-safety rules baked into the flows

- The customer flow orders from a QA store only (`QA_STORE_SLUG`) —
  never a production restaurant.
- The merchant flow performs NO status mutations (read-only assertions)
  — status-transition flows belong to a dedicated QA business with
  disposable orders, added after this baseline runs green once.
