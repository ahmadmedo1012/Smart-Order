"use client";

import * as React from "react";
import Image from "next/image";
import { api } from "@/lib/client";
import { formatLydAmount, tryParseLyd } from "@/lib/money";
import { compressImage } from "@/lib/compress";
import type { Product, Category } from "@/app/dashboard/products/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/dashboard/form-field";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Trash2, ImagePlus, X, Layers } from "lucide-react";

interface VariantDraft {
  key: string;
  name: string;
  priceDelta: string;
}
interface OptionDraft {
  key: string;
  name: string;
  priceDelta: string;
}
interface GroupDraft {
  key: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  options: OptionDraft[];
}

let draftId = 0;
const nid = () => `d${++draftId}`;

export function ProductEditor({
  product,
  categories,
  businessId,
  onClose,
}: {
  product: Product | null;
  categories: Category[];
  businessId: string;
  onClose: (changed: boolean) => void;
}) {
  const [name, setName] = React.useState(product?.name ?? "");
  const [description, setDescription] = React.useState(
    product?.description ?? "",
  );
  const [categoryId, setCategoryId] = React.useState(
    product?.categoryId ?? "none",
  );
  const [price, setPrice] = React.useState(
    product ? formatLydAmount(product.price) : "",
  );
  const [imageUrl, setImageUrl] = React.useState(product?.imageUrl ?? "");
  const [isAvailable, setIsAvailable] = React.useState(
    product?.isAvailable ?? true,
  );
  const [isFeatured, setIsFeatured] = React.useState(
    product?.isFeatured ?? false,
  );
  const [trackInventory, setTrackInventory] = React.useState(
    product?.trackInventory ?? false,
  );
  const [stockQuantity, setStockQuantity] = React.useState(
    String(product?.stockQuantity ?? 0),
  );
  const [variants, setVariants] = React.useState<VariantDraft[]>(
    product?.variants.map((v) => ({
      key: nid(),
      name: v.name,
      priceDelta: formatLydAmount(v.priceDelta),
    })) ?? [],
  );
  const [groups, setGroups] = React.useState<GroupDraft[]>(
    product?.optionGroups.map((g) => ({
      key: nid(),
      name: g.name,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      required: g.required,
      options: g.options.map((o) => ({
        key: nid(),
        name: o.name,
        priceDelta: formatLydAmount(o.priceDelta),
      })),
    })) ?? [],
  );
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  /* r132 (A2 F3): destructive archive + dirty-draft guard. (a) The archive
     button now routes through the shared ConfirmDialog — the 5th call site
     (categories/delivery/payments/staff converted in r131; this one was
     missed). (b) ESC / scrim / X / إلغاء no longer discard a dirty draft
     silently: every close attempt funnels through requestClose, and a
     dirty draft asks first (AlertDialog reuse per the r131 ruling). */
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  /* r131 (F3, A5 P1-6): field-level validation — the two required
 basics (name, price) now validate on submit with the canonical
 error recipe (aria-invalid destructive border + halo + inline
 role=alert message via aria-describedby); cross-field checks
 (variants/groups) stay toast-level. */
  const [fieldErrors, setFieldErrors] = React.useState<{
    name?: string;
    price?: string;
  }>({});

  /* Pristine snapshot for the dirty check — the same mapping that
     seeded the useState drafts above (formatLydAmount round-trip
     included), so toggles/typoes/added rows all count as dirty. */
  const pristine = {
    name: product?.name ?? "",
    description: product?.description ?? "",
    categoryId: product?.categoryId ?? "none",
    price: product ? formatLydAmount(product.price) : "",
    imageUrl: product?.imageUrl ?? "",
    isAvailable: product?.isAvailable ?? true,
    isFeatured: product?.isFeatured ?? false,
    trackInventory: product?.trackInventory ?? false,
    stockQuantity: String(product?.stockQuantity ?? 0),
    variants:
      product?.variants.map((v) => ({
        name: v.name,
        priceDelta: formatLydAmount(v.priceDelta),
      })) ?? [],
    groups:
      product?.optionGroups.map((g) => ({
        name: g.name,
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        required: g.required,
        options: g.options.map((o) => ({
          name: o.name,
          priceDelta: formatLydAmount(o.priceDelta),
        })),
      })) ?? [],
  };
  const dirty =
    name !== pristine.name ||
    description !== pristine.description ||
    categoryId !== pristine.categoryId ||
    price !== pristine.price ||
    imageUrl !== pristine.imageUrl ||
    isAvailable !== pristine.isAvailable ||
    isFeatured !== pristine.isFeatured ||
    trackInventory !== pristine.trackInventory ||
    stockQuantity !== pristine.stockQuantity ||
    variants.length !== pristine.variants.length ||
    variants.some(
      (v, i) =>
        v.name !== pristine.variants[i].name ||
        v.priceDelta !== pristine.variants[i].priceDelta,
    ) ||
    groups.length !== pristine.groups.length ||
    groups.some(
      (g, i) =>
        g.name !== pristine.groups[i].name ||
        g.minSelect !== pristine.groups[i].minSelect ||
        g.maxSelect !== pristine.groups[i].maxSelect ||
        g.required !== pristine.groups[i].required ||
        g.options.length !== pristine.groups[i].options.length ||
        g.options.some(
          (o, j) =>
            o.name !== pristine.groups[i].options[j].name ||
            o.priceDelta !== pristine.groups[i].options[j].priceDelta,
        ),
    );

  function requestClose() {
    /* a save/archive is settling — it closes the editor on success;
       don't race it with a manual close. */
    if (saving) return;
    if (!dirty) {
      onClose(false);
      return;
    }
    setDiscardOpen(true);
  }

  function validateFields(): boolean {
    const e: { name?: string; price?: string } = {};
    if (!name.trim()) e.name = "أدخل اسم المنتج";
    if (tryParseLyd(price) === null)
      e.price = "أدخل سعراً صحيحاً (مثال: 12.500)";
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { dataUrl } = await compressImage(file);
      const res = await api.post<{ url: string }>("/api/media", {
        businessId,
        data: dataUrl,
      });
      setImageUrl(res.data.url);
      toast.success("تم رفع الصورة");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  function validate(): string | null {
    if (name.trim().length < 1) return "أدخل اسم المنتج";
    if (tryParseLyd(price) === null) return "أدخل سعراً صحيحاً (مثال: 12.500)";
    if (variants.some((v) => !v.name.trim()))
      return "أكمل أسماء الأحجام أو احذف الفارغ";
    if (groups.some((g) => !g.name.trim()))
      return "أكمل أسماء مجموعات الإضافات أو احذف الفارغ";
    if (groups.some((g) => g.options.some((o) => !o.name.trim())))
      return "أكمل أسماء الإضافات أو احذف الفارغ";
    if (groups.some((g) => g.minSelect > g.maxSelect))
      return "الحد الأدنى للاختيار أكبر من الأقصى في إحدى المجموعات";
    if (variants.some((v) => tryParseLyd(v.priceDelta) === null))
      return "سعر إضافي غير صحيح في الأحجام";
    if (
      groups.some((g) =>
        g.options.some((o) => tryParseLyd(o.priceDelta) === null),
      )
    )
      return "سعر إضافي غير صحيح";
    return null;
  }

  async function save() {
    if (!validateFields()) return;
    const vErr = validate();
    if (vErr) {
      toast.error(vErr);
      return;
    }
    setSaving(true);
    const payload = {
      businessId,
      name: name.trim(),
      description: description.trim() || undefined,
      imageUrl: imageUrl || undefined,
      categoryId: categoryId === "none" ? null : categoryId,
      price: price.trim(),
      isAvailable,
      isFeatured,
      trackInventory,
      /* r132 (A2 F25): clamp negatives — type=number min={0} only constrains
         spinners; a typed -5 passed through to a generic server Zod error. */
      stockQuantity: trackInventory
        ? Math.max(0, parseInt(stockQuantity || "0", 10) || 0)
        : 0,
      variants: variants.map((v) => ({
        name: v.name.trim(),
        priceDelta: v.priceDelta || "0",
      })),
      optionGroups: groups.map((g) => ({
        name: g.name.trim(),
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        required: g.required,
        options: g.options.map((o) => ({
          name: o.name.trim(),
          priceDelta: o.priceDelta || "0",
        })),
      })),
    };
    try {
      if (product) {
        await api.patch(`/api/products/${product.id}`, payload);
        toast.success("تم تحديث المنتج");
      } else {
        await api.post("/api/products", payload);
        toast.success("تمت إضافة المنتج");
      }
      onClose(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!product) return;
    setSaving(true);
    try {
      await api.delete(`/api/products/${product.id}?businessId=${businessId}`);
      toast.success("تم أرشفة المنتج");
      onClose(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الأرشفة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(v) => !v && requestClose()}>
      <DialogContent
        dir="rtl"
        className="max-w-2xl w-[calc(100vw-2rem)] max-h-[92vh] p-0 gap-0"
      >
        <DialogHeader className="p-5 pb-3 border-b">
          <DialogTitle>{product ? "تعديل المنتج" : "منتج جديد"}</DialogTitle>
          <DialogDescription>
            الأحجام والإضافات اختيارية — أضفها عند الحاجة
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(92vh-11rem)]">
          <div className="p-5 space-y-6">
            {/* Basics */}
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="p-name">اسم المنتج *</Label>
                <Input
                  id="p-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name)
                      setFieldErrors((f) => ({ ...f, name: undefined }));
                  }}
                  placeholder="مثال: بيتزا مارغريتا"
                  maxLength={100}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={
                    fieldErrors.name ? "p-name-error" : undefined
                  }
                />
                {fieldErrors.name && (
                  <FieldError id="p-name-error">{fieldErrors.name}</FieldError>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-price">السعر (د.ل) *</Label>
                <Input
                  id="p-price"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    if (fieldErrors.price)
                      setFieldErrors((f) => ({ ...f, price: undefined }));
                  }}
                  placeholder="12.500"
                  inputMode="decimal"
                  dir="ltr"
                  className="text-start tabular-nums"
                  aria-invalid={!!fieldErrors.price}
                  aria-describedby={
                    fieldErrors.price ? "p-price-error" : undefined
                  }
                />
                {fieldErrors.price && (
                  <FieldError id="p-price-error">
                    {fieldErrors.price}
                  </FieldError>
                )}
              </div>
              <div className="space-y-2">
                <Label>القسم</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون قسم</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="p-desc">الوصف</Label>
                <Textarea
                  id="p-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف قصير يظهر للعملاء"
                  maxLength={500}
                  className="min-h-16"
                />
              </div>
            </section>

            {/* Image */}
            <section className="space-y-2">
              <Label>صورة المنتج</Label>
              <div className="flex items-start gap-4">
                <div className="relative size-28 rounded-xl border border-dashed border-border bg-muted/50 overflow-hidden shrink-0">
                  {imageUrl ? (
                    <>
                      <Image
                        src={imageUrl}
                        alt="صورة المنتج"
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="absolute top-1 end-1 rounded-full bg-background/90 shadow p-1"
                        aria-label="إزالة الصورة"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <label className="size-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                      {uploading ? (
                        <span
                          className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-accent-foreground"
                          aria-hidden="true"
                        />
                      ) : (
                        <ImagePlus className="size-6" aria-hidden="true" />
                      )}
                      <span className="text-[11px]">اختر صورة</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={onImageSelected}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  تُضغط الصورة تلقائياً قبل الرفع. الحد الأقصى بعد الضغط 500
                  كيلوبايت.
                  <br />
                  أفضل مقاس: مربعة أو 4:3، بخلفية بسيطة.
                </p>
              </div>
            </section>

            {/* Toggles */}
            <section className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <div className="text-sm font-medium">متاح للطلب</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    يظهر للعملاء في المتجر
                  </div>
                </div>
                <Switch
                  checked={isAvailable}
                  onCheckedChange={setIsAvailable}
                  aria-label="متاح للطلب"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <div className="text-sm font-medium">منتج مميز</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    يظهر في مقدمة المتجر
                  </div>
                </div>
                <Switch
                  checked={isFeatured}
                  onCheckedChange={setIsFeatured}
                  aria-label="منتج مميز"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3 sm:col-span-2">
                <div>
                  <div className="text-sm font-medium">تتبع المخزون</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    يُخصم تلقائياً مع كل طلب
                  </div>
                </div>
                <Switch
                  checked={trackInventory}
                  onCheckedChange={setTrackInventory}
                  aria-label="تتبع المخزون"
                />
              </div>
              {trackInventory && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="p-stock">الكمية المتوفرة</Label>
                  <Input
                    id="p-stock"
                    type="number"
                    min={0}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-32 tabular-nums"
                    dir="ltr"
                  />
                </div>
              )}
            </section>

            {/* Variants */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                    <Layers
                      className="size-4 text-accent-foreground"
                      aria-hidden="true"
                    />
                    الأحجام / الخيارات الأساسية
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    مثال: صغير، وسط، كبير — سعر إضافي لكل حجم
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setVariants((v) => [
                      ...v,
                      { key: nid(), name: "", priceDelta: "0" },
                    ])
                  }
                >
                  <Plus className="size-4 me-1" aria-hidden="true" />
                  إضافة
                </Button>
              </div>
              {variants.length > 0 && (
                <ul className="space-y-2">
                  {variants.map((v, i) => (
                    <li key={v.key} className="flex items-center gap-2">
                      {/* r132 (A2 F19): the GripVertical drag handle is retired —
                          it promised drag/drop that never existed (no reordering
                          anywhere in the file); an honest row reads cleaner. */}
                      <Input
                        value={v.name}
                        onChange={(e) =>
                          setVariants((vs) =>
                            vs.map((x) =>
                              x.key === v.key
                                ? { ...x, name: e.target.value }
                                : x,
                            ),
                          )
                        }
                        placeholder={`الحجم ${i + 1}`}
                        className="flex-1"
                        maxLength={60}
                      />
                      <div className="relative w-28 shrink-0">
                        <Input
                          value={v.priceDelta}
                          onChange={(e) =>
                            setVariants((vs) =>
                              vs.map((x) =>
                                x.key === v.key
                                  ? { ...x, priceDelta: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          inputMode="decimal"
                          dir="ltr"
                          className="text-start tabular-nums ps-2"
                          aria-label={`سعر إضافي للحجم ${i + 1}`}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setVariants((vs) => vs.filter((x) => x.key !== v.key))
                        }
                        aria-label="حذف الحجم"
                      >
                        <Trash2
                          className="size-4 text-destructive-ink"
                          aria-hidden="true"
                        />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Option groups */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                    <Layers
                      className="size-4 text-accent-foreground"
                      aria-hidden="true"
                    />
                    مجموعات الإضافات
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    مثال: إضافات (جبنة، دجاج، صوص) باختيار متعدد
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setGroups((gs) => [
                      ...gs,
                      {
                        key: nid(),
                        name: "",
                        minSelect: 0,
                        maxSelect: 1,
                        required: false,
                        options: [],
                      },
                    ])
                  }
                >
                  <Plus className="size-4 me-1" aria-hidden="true" />
                  مجموعة
                </Button>
              </div>
              {groups.map((g) => (
                <div key={g.key} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={g.name}
                      onChange={(e) =>
                        setGroups((gs) =>
                          gs.map((x) =>
                            x.key === g.key
                              ? { ...x, name: e.target.value }
                              : x,
                          ),
                        )
                      }
                      placeholder="اسم المجموعة (مثال: إضافات)"
                      className="flex-1"
                      maxLength={60}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setGroups((gs) => gs.filter((x) => x.key !== g.key))
                      }
                      aria-label="حذف المجموعة"
                    >
                      <Trash2
                        className="size-4 text-destructive-ink"
                        aria-hidden="true"
                      />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {/* r131 (F3, A5 P1-1): maxSelect rides the canonical
 ui/select primitive (sm rung) — was a raw native
 h-8 select with no focus recipe. */}
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        أقصى اختيار:
                      </span>
                      <Select
                        value={String(g.maxSelect)}
                        onValueChange={(v) => {
                          const n = parseInt(v, 10);
                          setGroups((gs) =>
                            gs.map((x) =>
                              x.key === g.key
                                ? {
                                    ...x,
                                    maxSelect: n,
                                    minSelect: Math.min(x.minSelect, n),
                                  }
                                : x,
                            ),
                          );
                        }}
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label="أقصى عدد اختيارات"
                          className="w-16 tabular-nums"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </span>
                    {/* r131 (F3): raw accent checkbox → the Switch
 primitive (the 3 toggle rows above already ride it). */}
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <span className="text-xs">إلزامية للعميل</span>
                      <Switch
                        checked={g.required}
                        onCheckedChange={(checked) =>
                          setGroups((gs) =>
                            gs.map((x) =>
                              x.key === g.key
                                ? {
                                    ...x,
                                    required: checked,
                                    minSelect: checked ? 1 : 0,
                                  }
                                : x,
                            ),
                          )
                        }
                        aria-label="مجموعة إلزامية للعميل"
                      />
                    </label>
                  </div>
                  <ul className="space-y-2">
                    {g.options.map((o) => (
                      <li key={o.key} className="flex items-center gap-2">
                        <Input
                          value={o.name}
                          onChange={(e) =>
                            setGroups((gs) =>
                              gs.map((x) =>
                                x.key === g.key
                                  ? {
                                      ...x,
                                      options: x.options.map((y) =>
                                        y.key === o.key
                                          ? { ...y, name: e.target.value }
                                          : y,
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                          placeholder="اسم الإضافة"
                          className="flex-1"
                          maxLength={60}
                        />
                        <Input
                          value={o.priceDelta}
                          onChange={(e) =>
                            setGroups((gs) =>
                              gs.map((x) =>
                                x.key === g.key
                                  ? {
                                      ...x,
                                      options: x.options.map((y) =>
                                        y.key === o.key
                                          ? { ...y, priceDelta: e.target.value }
                                          : y,
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                          inputMode="decimal"
                          dir="ltr"
                          className="w-24 text-start tabular-nums shrink-0"
                          aria-label="السعر الإضافي"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setGroups((gs) =>
                              gs.map((x) =>
                                x.key === g.key
                                  ? {
                                      ...x,
                                      options: x.options.filter(
                                        (y) => y.key !== o.key,
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                          aria-label="حذف الإضافة"
                        >
                          <Trash2
                            className="size-4 text-destructive-ink"
                            aria-hidden="true"
                          />
                        </Button>
                      </li>
                    ))}
                    <li>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed"
                        onClick={() =>
                          setGroups((gs) =>
                            gs.map((x) =>
                              x.key === g.key
                                ? {
                                    ...x,
                                    options: [
                                      ...x.options,
                                      { key: nid(), name: "", priceDelta: "0" },
                                    ],
                                  }
                                : x,
                            ),
                          )
                        }
                      >
                        <Plus className="size-4 me-1" aria-hidden="true" />
                        إضافة خيار
                      </Button>
                    </li>
                  </ul>
                </div>
              ))}
            </section>
          </div>
        </ScrollArea>

        <div className="p-4 border-t flex items-center gap-2">
          {product && (
            <Button
              variant="outline"
              onClick={() => setArchiveOpen(true)}
              disabled={saving}
              className="text-destructive-ink hover:bg-destructive/10"
            >
              أرشفة
            </Button>
          )}
          <div className="ms-auto flex gap-2">
            <Button
              variant="outline"
              onClick={requestClose}
              disabled={saving}
            >
              إلغاء
            </Button>
            <Button
              onClick={save}
              disabled={saving || uploading}
              loading={saving}
            >
              {product ? "حفظ التعديلات" : "إضافة المنتج"}
            </Button>
          </div>
        </div>
      </DialogContent>
      </Dialog>

      {/* r132 (A2 F3a): destructive archive rides the shared ConfirmDialog
          («تأكيد الأرشفة») — same Arabic pattern as the 4 r131 conversions. */}
      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={(v) => !v && setArchiveOpen(false)}
        title="تأكيد الأرشفة"
        description={`سيُخفى "${product?.name ?? ""}" من متجرك ولن يظهر للعملاء بعد الآن.`}
        confirmLabel="أرشفة"
        busy={saving}
        onConfirm={archive}
      />

      {/* r132 (A2 F3b): dirty-draft guard — ESC / scrim / X / إلغاء on a
          dirty editor ask before discarding; cancel returns to the draft. */}
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={(v) => !v && setDiscardOpen(false)}
        title="تجاهل التغييرات غير المحفوظة؟"
        description="لديك تعديلات غير محفوظة على هذا المنتج، وسيتم فقدانها عند الإغلاق."
        confirmLabel="تجاهل"
        onConfirm={() => {
          setDiscardOpen(false);
          onClose(false);
        }}
      />
    </>
  );
}
