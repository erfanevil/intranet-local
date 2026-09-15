import type { Metadata } from "next";
import Link from "next/link";
import {
  CircleCheckBig,
  CircleX,
  Clock,
  CreditCard,
  Package,
  PackageSearch,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getOrderByTrackingCode, type OrderWithEvents } from "@/lib/orders";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  faDateTime,
  faToman,
} from "@/lib/format";

export const metadata: Metadata = {
  title: "وضعیت سفارش",
};

const STEP_ICON: Record<(typeof STATUS_ORDER)[number], LucideIcon> = {
  pending: Clock,
  paid: CreditCard,
  preparing: Package,
  sent: Truck,
  delivered: CircleCheckBig,
};

const STEP_DESCRIPTION: Record<(typeof STATUS_ORDER)[number], string> = {
  pending: "سفارش ثبت شده و در انتظار پرداخته.",
  paid: "پرداخت تأیید شد؛ سفارش وارد صف آماده‌سازی می‌شه.",
  preparing: "فروشگاه داره سفارشت رو آماده و بسته‌بندی می‌کنه.",
  sent: "بسته‌ات به پست تحویل داده شده و در راهه.",
  delivered: "سفارش به دستت رسید. خوش به حالت!",
};

export default async function TrackResultPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const result = await getOrderByTrackingCode(decodeURIComponent(code));

  return (
    <div className="subpage-shell">
      <a href="#main" className="skip-link">
        رفتن به محتوای اصلی
      </a>
      <SiteHeader />
      <main id="main" className="subpage-main">
        <div className="container-x">
          {result ? <OrderResult data={result} /> : <NotFound code={code} />}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function OrderResult({ data }: { data: OrderWithEvents }) {
  const { order, events } = data;
  const currentIndex = STATUS_ORDER.indexOf(order.status);
  const lastEvent = events[events.length - 1];
  const eventsByStatus = new Map(events.map((e) => [e.status, e]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="subpage-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="section-kicker">کد پیگیری</span>
            <h1 className="font-[family-name:var(--font-head)] text-2xl font-extrabold" dir="ltr">
              {order.trackingCode}
            </h1>
          </div>
          <span className={`status-chip ${order.status}`}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-5 sm:grid-cols-2">
          <div>
            <div className="text-[0.78rem] text-[var(--muted-2)]">محصول</div>
            <div className="font-bold">{order.productName}</div>
          </div>
          <div>
            <div className="text-[0.78rem] text-[var(--muted-2)]">مبلغ سفارش</div>
            <div className="font-bold">{faToman(order.amountToman)}</div>
          </div>
          <div>
            <div className="text-[0.78rem] text-[var(--muted-2)]">گیرنده</div>
            <div className="font-bold">
              {order.customerName}
              {order.city ? ` — ${order.city}` : ""}
            </div>
          </div>
          <div>
            <div className="text-[0.78rem] text-[var(--muted-2)]">آخرین به‌روزرسانی</div>
            <div className="font-bold">
              {lastEvent ? faDateTime(lastEvent.happenedAt) : faDateTime(order.updatedAt)}
            </div>
          </div>
        </div>
      </div>

      <div className="subpage-card">
        <h2 className="mb-6 font-[family-name:var(--font-head)] text-lg font-extrabold">
          مسیر سفارش
        </h2>
        <div className="track-timeline">
          {STATUS_ORDER.map((status, index) => {
            const Icon = STEP_ICON[status];
            const isDone = index < currentIndex;
            const isCurrent = index === currentIndex;
            const event = eventsByStatus.get(status);
            return (
              <div
                key={status}
                className={`track-step${isDone ? " is-done" : ""}${isCurrent ? " is-current" : ""}`}
              >
                <div className="track-dot">
                  <Icon size={17} strokeWidth={2.2} />
                </div>
                <div className="track-info">
                  <h4>{STATUS_LABEL[status]}</h4>
                  <p>{STEP_DESCRIPTION[status]}</p>
                  {event ? <time>{faDateTime(event.happenedAt)}</time> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Link href="/track" className="btn btn-ghost self-center">
        <PackageSearch size={18} />
        پیگیری سفارش دیگر
      </Link>
    </div>
  );
}

function NotFound({ code }: { code: string }) {
  return (
    <div className="subpage-card mx-auto w-full max-w-xl text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#fef2f2] text-[#b91c1c]">
        <CircleX size={30} strokeWidth={2} />
      </div>
      <h1 className="mb-3 font-[family-name:var(--font-head)] text-2xl font-extrabold">
        سفارشی با این کد پیدا نشد
      </h1>
      <p className="mb-2 leading-8 text-[var(--muted)]">
        کد <bdi dir="ltr">«{decodeURIComponent(code)}»</bdi> رو دوباره چک کن؛ کد
        پیگیری همون لحظه‌ی ثبت سفارش داخل دایرکت برات ارسال شده.
      </p>
      <p className="mb-8 text-[0.85rem] text-[var(--muted-2)]">
        برای تست، می‌تونی کد SF-1001 رو امتحان کنی.
      </p>
      <Link href="/track" className="btn btn-primary">
        جست‌وجوی دوباره
      </Link>
    </div>
  );
}
