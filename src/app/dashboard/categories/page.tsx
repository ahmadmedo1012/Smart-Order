"use client";

import * as React from "react";
import Image from "next/image";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { compressImage } from "@/lib/compress";
import { toast } from "sonner";
import { LayoutGrid, Plus, Trash2, Pencil, ImagePlus, Loader2, X } from "lucide-react";
import type { Category } from "@/app/dashboard/products/page";

export default function CategoriesPage() {
  const { businessId } = useBusiness();
  const [categories, setCategories] = React.useState<Category[] | null>(null);
  const [error, setError] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(() => {
    if (!businessId) return;
    setError(false);
    api
      .get<{ categories: Category[] }>(`/api/categories?businessId=${businessId}`)
      .then((r) => setCategories(r.data.categories))
      .catch(() => setError(true));
  }, [businessId]);

  React.useEffect(load, [load]);

  if (error) return <ErrorState retry={load} />;
  if (categories === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="الأقسام"
        subtitle={
          <span className="tabular nums">
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
            <li key={c.id} className="group rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <span className="text-xs text-muted-foreground/60 tabular shrink-0" aria-hidden="true">
                {i + 1}
              </span>
              {c.imageUrl ? (
                 
                <Image src={c.imageUrl} alt="" width={44} height={44} className="size-11 rounded-lg object-cover shrink-0" />
              ) : (
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-accent-foreground shrink-0">
                  <LayoutGrid className="size-5" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 tabular">
                  {c._count?.products ?? 0} منتج
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditing(c)} className="rounded-lg p-2 hover:bg-muted transition-colors" aria-label={`تعديل ${c.name}`}>
                  <Pencil className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`حذف "${c.name}"؟ سيُؤرشف القسم إن كان يحتوي منتجات.`)) return;
                    try {
                      const r = await api.delete<{ archived?: boolean; deleted?: boolean }>(`/api/categories/${c.id}?businessId=${businessId}`);
                      toast.success(r.data.archived ? "تم أرشفة القسم" : "تم حذف القسم");
                      load();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "تعذر الحذف");
                    }
                  }}
                  className="rounded-lg p-2 hover:bg-destructive/10 transition-colors"
                  aria-label={`حذف ${c.name}`}
                >
                  <Trash2 className="size-4 text-destructive-ink" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

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
  const [description, setDescription] = React.useState(category?.description ?? "");
  const [imageUrl, setImageUrl] = React.useState(category?.imageUrl ?? "");
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { dataUrl } = await compressImage(file, { maxDimension: 600 });
      const r = await api.post<{ url: string }>("/api/media", { businessId, data: dataUrl });
      setImageUrl(r.data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!name.trim()) {
      toast.error("أدخل اسم القسم");
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
      toast.error(err instanceof Error ? err.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose(false)}>
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
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label="إغلاق"
          >
            <X className="size-4.5" aria-hidden="true" />
          </DialogClose>
        </div>
        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <label htmlFor="c-name" className="text-sm font-medium">
              اسم القسم *
            </label>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: مشروبات ساخنة"
              maxLength={60}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="c-desc" className="text-sm font-medium">
              وصف قصير
            </label>
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
            <span className="text-sm font-medium">صورة القسم (اختياري)</span>
            <div className="flex items-center gap-3">
              <div className="relative size-20 rounded-xl border border-dashed border-border bg-muted/50 overflow-hidden">
                {imageUrl ? (
                  <>
                    <Image src={imageUrl} alt="" fill sizes="80px" className="object-cover" />
                    <button type="button" onClick={() => setImageUrl("")} className="absolute top-1 end-1 rounded-full bg-background/90 shadow p-1" aria-label="إزالة الصورة">
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <label className="size-full flex items-center justify-center text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    {uploading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-5" aria-hidden="true" />}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onImage} disabled={uploading} />
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
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
