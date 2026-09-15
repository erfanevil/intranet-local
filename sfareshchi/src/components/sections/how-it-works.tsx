import { BadgeCheck, CreditCard, Tag, Truck } from "lucide-react";
import { InstagramIcon } from "@/components/icons";
import { Reveal } from "@/components/reveal";

const STEPS = [
  {
    icon: InstagramIcon,
    title: "دریافت سفارش",
    text: "پیام سفارش از دایرکت اینستاگرام خودش می‌شینه توی سفارشچی.",
  },
  {
    icon: Tag,
    title: "انتخاب محصول",
    text: "مشتری رنگ، سایز و تعداد مورد نظرش رو مشخص می‌کنه.",
  },
  {
    icon: CreditCard,
    title: "پرداخت",
    text: "لینک پرداخت ارسال می‌شه و رسید یا فیش تأیید می‌شه.",
  },
  {
    icon: BadgeCheck,
    title: "تأیید سفارش",
    text: "سفارش با یک کلیک ثبت و برای آماده‌سازی مشخص می‌شه.",
  },
  {
    icon: Truck,
    title: "ارسال و پیگیری",
    text: "وضعیت ارسال برای مشتری هر لحظه قابل پیگیریه.",
  },
];

const FA_NUMERALS = ["۱", "۲", "۳", "۴", "۵"];

export function HowItWorks() {
  return (
    <section id="how" className="landing-section">
      <div className="container-x">
        <Reveal className="section-head center">
          <span className="section-kicker">نحوه کار</span>
          <h2>از پیام دایرکت تا دم در خونه مشتری</h2>
          <p>
            سفارشچی پنج مرحله رو برات ساده می‌کنه، بدون این‌که خودت دنبال
            هیچ‌کدوم بگردی.
          </p>
        </Reveal>
        <div className="steps-row">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} className="step-item" delay={i * 0.08}>
              <div className="step-num">
                <span className="step-tag">{FA_NUMERALS[i]}</span>
                <step.icon size={22} strokeWidth={1.8} />
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
