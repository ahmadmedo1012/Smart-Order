import { Banknote, Landmark, MessageCircle, Phone } from "lucide-react";

/** Family ProviderPicker tile geometry: icon + label, mapped per payment type. */
export function paymentIcon(type: string) {
  if (type === "CASH" || type === "COD") return Banknote;
  if (type === "WHATSAPP") return MessageCircle;
  if (type === "MADAR" || type === "LIBYANA") return Phone;
  return Landmark;
}
