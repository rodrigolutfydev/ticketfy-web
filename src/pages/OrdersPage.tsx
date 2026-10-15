import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Receipt } from "lucide-react";
import { listMyOrders } from "../api/endpoints";
import type { OrderStatus } from "../api/types";
import Pagination from "../components/Pagination";
import StatusBadge from "../components/StatusBadge";
import { Empty, ErrorMessage } from "../components/StateMessage";
import { TabPanel, Tabs, useTabParam } from "../components/Tabs";
import { ButtonLink, PageTitle, Skeleton } from "../components/ui";
import { formatPrice, formatShortDate, shortId } from "../utils/format";
import { usePageTitle } from "../hooks/usePageTitle";
import { errorMessage } from "../api/client";
import { useI18n } from "../i18n/LocaleContext";

// Abas de pedidos. Cada aba é um grupo de status.
const TABS = ["todos", "pendentes", "pagos", "encerrados"] as const;
type TabKey = (typeof TABS)[number];
const tabStatuses: Record<TabKey, OrderStatus[] | null> = {
  todos: null,
  pendentes: ["PENDING"],
  pagos: ["PAID"],
  encerrados: ["EXPIRED", "CANCELLED", "REFUNDED"],
};

export default function OrdersPage() {
  const { t, locale } = useI18n();
  const o = t.buyer.orders;
  usePageTitle(o.pageTitle);
  const [tab, setTab] = useTabParam(TABS, "todos");
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(0, Number.parseInt(searchParams.get("page") ?? "0", 10) || 0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["orders", page],
    queryFn: () => listMyOrders(page),
  });

  // O filtro por aba é feito aqui no navegador, sobre a página carregada
  // (20 pedidos). Para filtrar no banco, a API precisaria aceitar ?status=.
  const allowed = tabStatuses[tab];
  const orders = (data?.content ?? []).filter((o) => !allowed || allowed.includes(o.status));

  function goToPage(newPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={o.title} subtitle={o.subtitle} />
      <Tabs
        label={o.tabsLabel}
        idPrefix="pedidos"
        value={tab}
        onChange={setTab}
        items={[
          { key: "todos", label: o.tabs.all },
          { key: "pendentes", label: o.tabs.pending },
          { key: "pagos", label: o.tabs.paid },
          { key: "encerrados", label: o.tabs.closed },
        ]}
      />
      <TabPanel idPrefix="pedidos" activeKey={tab}>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        )}
        {error && <ErrorMessage message={errorMessage(error) ?? ""} />}
        {data && orders.length === 0 && (
          <Empty
            icon={<Receipt size={22} />}
            title={tab === "todos" ? o.emptyTitle : o.emptyTabTitle}
            hint={tab === "todos" ? o.emptyHint : undefined}
          >
            {tab === "todos" && <ButtonLink to="/">{t.common.seeEvents}</ButtonLink>}
          </Empty>
        )}
        {orders.length > 0 && (
          <ul className="tf-panel overflow-hidden">
            {orders.map((order) => (
              <li key={order.id} className="border-b border-line last:border-0">
                <Link to={`/orders/${order.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-raised">
                  <div className="flex items-center gap-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-raised text-accent-text">
                      <Receipt size={18} aria-hidden />
                    </span>
                    <div>
                      <p className="font-bold text-ink">{o.order(shortId(order.id))}</p>
                      {order.createdAt && <p className="text-sm text-muted">{formatShortDate(order.createdAt, locale)}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={order.status} />
                    <span className="tabular w-28 text-right font-bold text-ink">{formatPrice(order.totalAmount, locale)}</span>
                    <ChevronRight size={18} className="text-subtle" aria-hidden />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {data && <Pagination page={data.page.number} totalPages={data.page.totalPages} onChange={goToPage} />}
      </TabPanel>
    </div>
  );
}
