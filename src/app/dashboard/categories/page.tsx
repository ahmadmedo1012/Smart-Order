"use client";

import * as React from "react";
import Image from "next/image";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/dashboard/page-header";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { FieldError } from "@/components/dashboard/form-field";
import { CategoriesSkeleton } from "@/components/dashboard/skeletons";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { compressImage } from "@/lib/compress";
import { useDirtyClose } from "@/hooks/use-dirty-close";
import { toast } from "sonner";
import { LayoutGrid, Plus, Trash2, Pencil, ImagePlus, X } from "lucide-react";
import type { Category } from "@/app/dashboard/products/page";

export default function CategoriesPage() {
  const { businessId } = useBusiness();
  const [categories, setCategories] = React.useState<Category[] | null>(null);
  const [error, setError] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [creating, setCreating] = React.useState(false);
  /* r131 (F3, A5 P2-5): destructive confirm rides the shared Radix
     ConfirmDialog (was a native window.confirm). */
  const [deleting, setDeleting] = React.useState<Category | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  const load = React.useCallback(() => {
    if (!businessId) return;
    setError(false);
    api
      .get<{ categories: Category[] }>(
        `/api/categories?businessId=${businessId}`,
      )
      .then((r) => setCategories(r.data.categories))
      .catch(() => setError(true));
  }, [businessId]);

  React.useEffect(load, [load]);

  if (error) return <ErrorState retry={load} />;
  if (categories === null) {
    /* r131 (F3, A5 P2-7): shape-matched card-grid skeleton. */
    return <CategoriesSkeleton />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="الأقسام"
        subtitle={
          <span className="tabular-nums">
            {categories.length} قسم — تظهر بترتيبها في المتجر
          </span>
        }
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4.5" aria-hidden="true" />
            قسم جديد
          </Button>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="لا أقسام بعد"
          description="نظّم منتجاتك في أقسام (مثال: مشروبات، مأكولات، حلويات) ليسهل على العميل التصفح"
          action={
            <Button onClick={() => setCreating(true)} variant="outline">
              <Plus className="size-4.5" aria-hidden="true" />
              أضف قسمك الأول
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((c, i) => (
            <li
              key={c.id}
              className="group rounded-xl border border-border bg-card p-4 flex items-center gap-3"
            >
              <span
                className="text-xs text-muted-foreground/60 tabular-nums shrink-0"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              {c.imageUrl ? (
                <Image
                  src={c.imageUrl}
                  alt=""
                  width={44}
                  height={44}
                  className="size-11 rounded-lg object-cover shrink-0"
                />
              ) : (
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-accent-foreground shrink-0">
                  <LayoutGrid className="size-5" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                  {c._count?.products ?? 0} منتج
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditing(c)}
                  className="rounded-lg p-2 hover:bg-muted transition-colors"
                  aria-label={`تعديل ${c.name}`}
                >
                  <Pencil
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
                <button
                  onClick={() => setDeleting(c)}
                  className="rounded-lg p-2 hover:bg-destructive/10 transition-colors"
                  aria-label={`حذف ${c.name}`}
                >
                  <Trash2
                    className="size-4 text-destructive-ink"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`حذف "${deleting?.name}"؟`}
        description="سيُؤرشف القسم إن كان يحتوي منتجات، وإلا يُحذف نهائياً."
        confirmLabel="حذف"
        busy={deleteBusy}
        onConfirm={async () => {
          if (!deleting) return;
          setDeleteBusy(true);
          try {
            const r = await api.delete<{
              archived?: boolean;
              deleted?: boolean;
            }>(`/api/categories/${deleting.id}?businessId=${businessId}`);
            toast.success(r.data.archived ? "تم أرشفة القسم" : "تم حذف القسم");
            setDeleting(null);
            load();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "تعذّر الحذف");
          } finally {
            setDeleteBusy(false);
          }
        }}
      />

      {(creating || editing) && (
        <CategoryDialog
          category={editing}
          businessId={businessId}
          onClose={(changed) => {
            setCreating(false);
            setEditing(null);
            if (changed) load();
          }}
        />
      )}
    </div>
  );
}

function CategoryDialog({
  category,
  businessId,
  onClose,
}: {
  category: Category | null;
  businessId: string;
  onClose: (changed: boolean) => void;
}) {
  const [name, setName] = React.useState(category?.name ?? "");
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState(
    category?.description ?? "",
  );
  const [imageUrl, setImageUrl] = React.useState(category?.imageUrl ?? "");
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  /* r133 (A1 S6): dirty-draft guard — ESC/scrim/X/إلغاء on a dirty
     draft (name/description/uploaded image) ask first instead of
     discarding silently (product-editor recipe via useDirtyClose). */
  const pristine = {
    name: category?.name ?? "",
    description: category?.description ?? "",
    imageUrl: category?.imageUrl ?? "",
  };
  const dirty =
    name !== pristine.name ||
    description !== pristine.description ||
    imageUrl !== pristine.imageUrl;
  const { requestClose, guard } = useDirtyClose({
    dirty,
    busy: saving,
    close: () => onClose(false),
    entityLabel: category ? "القسم" : "القسم الجديد",
  });

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { dataUrl } = await compressImage(file, { maxDimension: 600 });
      const r = await api.post<{ url: string }>("/api/media", {
        businessId,
        data: dataUrl,
      });
      setImageUrl(r.data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    /* r131 (F3, A5 P1-6): field-level validation — required name gets
       the aria-invalid recipe + inline message, not a toast hunt. */
    if (!name.trim()) {
      setNameError("أدخل اسم القسم");
      return;
    }
    setSaving(true);
    try {
      if (category) {
        await api.patch(`/api/categories/${category.id}`, {
          businessId,
          name: name.trim(),
          description: description.trim() || null,
          imageUrl: imageUrl || null,
        });
        toast.success("تم تحديث القسم");
      } else {
        await api.post("/api/categories", {
          businessId,
          name: name.trim(),
          description: description.trim(),
          imageUrl,
        });
        toast.success("تمت إضافة القسم");
      }
      onClose(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && requestClose()}>
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden rounded-xl border-border bg-card p-0 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 p-5">
          <div>
            <DialogTitle className="font-heading text-lg font-semibold text-foreground">
              {category ? "تعديل القسم" : "قسم جديد"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px] text-muted-foreground">
              الاسم يظهر للعملاء في أعلى المتجر
            </DialogDescription>
          </div>
          <DialogClose
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="إغلاق"
          >
            <X className="size-4.5" aria-hidden="true" />
          </DialogClose>
        </div>
        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="c-name">اسم القسم *</Label>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="مثال: مشروبات ساخنة"
              maxLength={60}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "c-name-error" : undefined}
            />
            {nameError && (
              <FieldError id="c-name-error">{nameError}</FieldError>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-desc">وصف قصير</Label>
            <Textarea
              id="c-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اختياري"
              maxLength={200}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>صورة القسم (اختياري)</Label>
            <div className="flex items-center gap-3">
              <div className="relative size-20 rounded-xl border border-dashed border-border bg-muted/50 overflow-hidden">
                {imageUrl ? (
                  <>
                    <Image
                      src={imageUrl}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute top-1 end-1 rounded-full bg-background/90 shadow p-1"
                      aria-label="إزالة الصورة"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <label className="size-full flex items-center justify-center text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    {uploading ? (
                      <span
                        className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-accent-foreground"
                        aria-hidden="true"
                      />
                    ) : (
                      <ImagePlus className="size-5" aria-hidden="true" />
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={onImage}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border/60 p-4">
          <DialogClose asChild>
            <Button variant="outline">إلغاء</Button>
          </DialogClose>
          <Button onClick={save} disabled={saving} loading={saving}>
            حفظ
          </Button>
        </div>
      </DialogContent>
      {guard}
    </Dialog>
  );
}
