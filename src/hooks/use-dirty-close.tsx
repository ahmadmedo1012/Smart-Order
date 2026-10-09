"use client";

import * as React from "react";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";

/**
 * useDirtyClose — the r132 product-editor dirty-draft guard (A2 F3b),
 * extracted so the dashboard dialogs stop discarding drafts silently
 * (r133 A1 S6): ESC / scrim / X / إلغاء all funnel through
 * requestClose(); a dirty draft asks first via the shared
 * ConfirmDialog (AlertDialog reuse per the r131 ruling).
 *
 * Snapshot the pristine values with the same mapping that seeded the
 * useState drafts, derive `dirty`, and pass it in — exactly like
 * product-editor.tsx's pristine/dirty/requestClose trio.
 */
export function useDirtyClose({
  dirty,
  busy = false,
  close,
  entityLabel,
}: {
  dirty: boolean;
  busy?: boolean;
  close: () => void;
  entityLabel: string;
}) {
  const [discardOpen, setDiscardOpen] = React.useState(false);

  const requestClose = React.useCallback(() => {
    /* a save is settling — it closes the dialog on success; don't
       race it with a manual close. */
    if (busy) return;
    if (!dirty) {
      close();
      return;
    }
    setDiscardOpen(true);
  }, [busy, dirty, close]);

  /* Rendered once per dialog — the AlertDialog portals to body, so it
     stacks correctly on top of the host Dialog (product-editor shape). */
  const guard = (
    <ConfirmDialog
      open={discardOpen}
      onOpenChange={(v) => !v && setDiscardOpen(false)}
      title={`تجاهل التغييرات في ${entityLabel}؟`}
      description="لديك تعديلات غير محفوظة — الإغلاق سيتجاهلها نهائياً."
      confirmLabel="تجاهل التغييرات"
      onConfirm={() => {
        setDiscardOpen(false);
        close();
      }}
    />
  );

  return { requestClose, guard };
}
