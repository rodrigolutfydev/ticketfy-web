import pt from "./paymentPix.pt.json";
import en from "./paymentPix.en.json";
import es from "./paymentPix.es.json";

export function getPaymentPixCopy(locale: string) {
  const lang = locale.toLowerCase().split("-")[0];
  if (lang === "en") return en;
  if (lang === "es") return es;
  return pt;
}
