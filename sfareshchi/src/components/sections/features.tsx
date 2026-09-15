import {
  ChartColumn,
  CreditCard,
  Heart,
  LayoutList,
  Tags,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { InstagramIcon } from "@/components/icons";
import { Reveal } from "@/components/reveal";

type IconType = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;

const FEATURES: { icon: IconType; title: string; text: string }[] = [
  {
    icon: InstagramIcon,
    title: "اتصال به دایرکت اینستاگرام",
    text: "سفارشچی به‌صورت خودکار پیام‌های دایرکت رو دریافت و دسته‌بندی می‌کنه.",
  },
  {
    icon: Tags,
    title: "کاتالوگ محصولات",
    text: "محصولات رو با رنگ، سایز و موجودی مشخص و همیشه به‌روز نگه دار.",
  },
  {
    icon: Heart,
    title: "پیگیری سفارش مشتری",
    text: "هر سفارش یک لینک پیگیری اختصاصی داره که مشتری خودش می‌بینه.",
  },
  {
    icon: LayoutList,
    title: "پنل مدیریت سفارش‌ها",
    text: "همه سفارش‌ها و مشتری‌ها، مرتب، قابل جست‌وجو و همیشه در دسترس.",
  },
  {
    icon: CreditCard,
    title: "پرداخت آنلاین",
    text: "درگاه پرداخت متصل و تأیید خودکار واریزی، بدون پیگیری دستی.",
  },
  {
    icon: ChartColumn,
    title: "گزارش و آمار فروش",
    text: "عملکرد فروشگاهت رو هر روز ببین و تصمیم بهتر بگیر.",
  },
];

export function Features() {
  return (
    <section id="features" className="landing-section">
      <div className="container-x">
        <Reveal className="section-head center">
          <span className="section-kicker">امکانات</span>
          <h2>هر چیزی که برای اداره فروشگاهت لازم داری</h2>
          <p>از دریافت سفارش تا گزارش فروش، سفارشچی این مسیر رو برات کامل می‌کنه.</p>
        </Reveal>
        <div className="features-grid">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} className="feature-item" delay={(i % 3) * 0.07}>
              <div className="feature-icon">
                <feature.icon size={22} strokeWidth={1.8} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
