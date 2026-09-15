import { ChartColumn, CreditCard, Heart, LayoutGrid } from "lucide-react";
import { Reveal } from "@/components/reveal";

const BENEFITS = [
  {
    icon: LayoutGrid,
    title: "صفر تا صد سفارش، یک‌جا",
    text: "سفارش‌های دایرکت، اکسل و کاغذ رو فراموش کن؛ همه‌چیز توی یک پنل ساده می‌شینه.",
  },
  {
    icon: Heart,
    title: "پیگیری روشن برای مشتری",
    text: "مشتری‌هات وضعیت سفارششون رو خودشون می‌بینن، بدون این‌که مدام پیام بدن و بپرسن کجاست.",
  },
  {
    icon: CreditCard,
    title: "پرداخت و تأیید سریع‌تر",
    text: "لینک پرداخت خودکار برای مشتری ارسال می‌شه و تأیید سفارش چند ثانیه بیشتر طول نمی‌کشه.",
  },
  {
    icon: ChartColumn,
    title: "گزارش فروش شفاف",
    text: "ببین کدوم محصول بیشتر فروش می‌ره و وقتت رو کجا داری از دست می‌دی.",
  },
];

export function Benefits() {
  return (
    <section className="benefits landing-section" id="benefits">
      <div className="container-x">
        <Reveal className="section-head">
          <span className="section-kicker">چرا سفارشچی</span>
          <h2>یک قدم جلوتر از دایرکت شلوغ</h2>
          <p>
            هر چقدر سفارش‌هات بیشتر بشه، دنبال کردن‌شون توی دایرکت سخت‌تر می‌شه.
            سفارشچی همون کار رو مرتب و بی‌دردسر انجام می‌ده.
          </p>
        </Reveal>
        <div className="benefits-grid">
          {BENEFITS.map((benefit, i) => (
            <Reveal key={benefit.title} className="benefit-item" delay={i * 0.07}>
              <div className="benefit-icon">
                <benefit.icon size={22} strokeWidth={2} />
              </div>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
