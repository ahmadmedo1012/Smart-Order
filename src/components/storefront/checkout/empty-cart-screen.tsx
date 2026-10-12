import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/states";
import { ShoppingBag, ArrowLeft } from "lucide-react";

/** 17-DEBT-SO: empty-cart screen extracted verbatim from
 * checkout-client.tsx. Pure presentation. */
export function EmptyCartScreen({ slug }: { slug: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <EmptyState
        icon={ShoppingBag}
        title="سلتك فارغة"
        description="أضف منتجات من المتجر لتتمكن من إتمام الطلب"
        action={
          <Button asChild className="px-6">
            <Link href={`/store/${slug}`}>
              <ArrowLeft className="size-4 me-2" aria-hidden="true" />
              العودة للمتجر
            </Link>
          </Button>
        }
      />
    </div>
  );
}
