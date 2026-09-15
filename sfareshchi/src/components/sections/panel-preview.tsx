import {
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Tag,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/reveal";

const SIDE_ITEMS = [
  { icon: LayoutDashboard, label: "داشبورد", active: true },
  { icon: ShoppingBag, label: "سفارش‌ها", active: false },
  { icon: Tag, label: "محصولات", active: false },
  { icon: Users, label: "مشتریان", active: false },
  { icon: Settings, label: "تنظیمات", active: false },
];

const STATS = [
  { num: "۲۴", lbl: "سفارش امروز" },
  { num: "۱۲", lbl: "در انتظار پرداخت" },
  { num: "۸", lbl: "آماده ارسال" },
  { num: "۳.۲M", lbl: "فروش این ماه (تومان)" },
];

const ROWS = [
  { name: "کفش اسپرت مدل ۱۴۶", chip: "pending", chipLabel: "در انتظار پرداخت", price: "۱,۲۸۵,۰۰۰ تومان" },
  { name: "ساعت مچی کلاسیک", chip: "paid", chipLabel: "پرداخت شد", price: "۹۸۰,۰۰۰ تومان" },
  { name: "کوله پشتی", chip: "sent", chipLabel: "ارسال شد", price: "۷۵۰,۰۰۰ تومان" },
  { name: "تیشرت لانگ", chip: "done", chipLabel: "تکمیل شده", price: "۴۵۰,۰۰۰ تومان" },
];

export function PanelPreview() {
  return (
    <section className="panel-section landing-section" id="panel">
      <div className="container-x">
        <Reveal className="section-head center">
          <span className="section-kicker">پیش‌نمایش پنل</span>
          <h2>یک پنل، همه‌ی سفارش‌ها</h2>
          <p>
            داشبورد سفارشچی رو باز کن و در یک نگاه بفهم چند سفارش در حال پردازش،
            پرداخت‌شده یا ارسال‌شده‌ست.
          </p>
        </Reveal>

        <Reveal
          className="browser-frame"
          role="img"
          aria-label="نمایش پنل مدیریت سفارشچی شامل فهرست سفارش‌ها و وضعیت هرکدام"
        >
          <div className="browser-bar">
            <span className="browser-dot" />
            <span className="browser-dot" />
            <span className="browser-dot" />
          </div>
          <div className="panel-body">
            <div className="panel-side">
              {SIDE_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className={`panel-side-item${item.active ? " active" : ""}`}
                >
                  <item.icon size={18} strokeWidth={2} />
                  {item.label}
                </div>
              ))}
            </div>
            <div className="panel-main">
              <div className="panel-stats">
                {STATS.map((stat) => (
                  <div key={stat.lbl} className="panel-stat">
                    <div className="num">{stat.num}</div>
                    <div className="lbl">{stat.lbl}</div>
                  </div>
                ))}
              </div>
              <div className="panel-table">
                {ROWS.map((row) => (
                  <div key={row.name} className="panel-row">
                    <div className="thumb" />
                    <div className="pname">{row.name}</div>
                    <span className={`status-chip ${row.chip}`}>{row.chipLabel}</span>
                    <div className="price">{row.price}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
