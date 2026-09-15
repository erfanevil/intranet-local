import Link from "next/link";
import { Building2, Check, Rocket, Star, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/reveal";

interface Plan {
  icon: LucideIcon;
  name: string;
  note: string;
  amount: string;
  unit?: string;
  cta: string;
  href: string;
  light?: boolean;
  featured?: boolean;
  feats: string[];
}

const PLANS: Plan[] = [
  {
    icon: Rocket,
    name: "رایگان",
    note: "برای شروع و تست سفارشچی",
    amount: "۰ تومان",
    cta: "شروع کن",
    href: "/start?plan=free",
    feats: ["تا ۳۰ سفارش در ماه", "اتصال یک پیج اینستاگرام", "پنل مدیریت پایه"],
  },
  {
    icon: Star,
    name: "حرفه‌ای",
    note: "پرطرفدارترین انتخاب فروشگاه‌ها",
    amount: "۴۹۰,۰۰۰",
    unit: "تومان / ماه",
    cta: "شروع رایگان ۱۴ روزه",
    href: "/start?plan=pro",
    light: true,
    featured: true,
    feats: [
      "سفارش نامحدود",
      "پرداخت آنلاین و تأیید خودکار",
      "پیگیری سفارش برای مشتری",
      "گزارش کامل فروش",
    ],
  },
  {
    icon: Building2,
    name: "فروشگاهی",
    note: "برای تیم‌ها و فروشگاه‌های بزرگ",
    amount: "قیمت اختصاصی",
    cta: "تماس با ما",
    href: "/start?plan=business",
    feats: ["اتصال چند پیج اینستاگرام", "دسترسی تیمی و نقش‌بندی", "پشتیبانی اختصاصی"],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="landing-section">
      <div className="container-x">
        <Reveal className="section-head center">
          <span className="section-kicker">قیمت‌گذاری</span>
          <h2>پلنی که با فروشگاهت رشد می‌کنه</h2>
          <p>بدون قرارداد بلندمدت؛ هر وقت خواستی پلنت رو عوض کن.</p>
        </Reveal>

        <div className="pricing-grid">
          {PLANS.map((plan, i) => (
            <Reveal
              key={plan.name}
              className={`price-card${plan.featured ? " featured" : ""}`}
              delay={i * 0.08}
            >
              <div className="price-icon">
                <plan.icon size={21} strokeWidth={1.8} />
              </div>
              <div className="price-plan">{plan.name}</div>
              <div className="price-note">{plan.note}</div>
              <div className="price-amount">
                {plan.amount}
                {plan.unit ? <span> {plan.unit}</span> : null}
              </div>
              <Link
                href={plan.href}
                className={`btn ${plan.light ? "btn-light" : "btn-ghost"} btn-block`}
              >
                {plan.cta}
              </Link>
              <ul className="price-feats">
                {plan.feats.map((feat) => (
                  <li key={feat}>
                    <Check size={18} strokeWidth={2.2} />
                    {feat}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
