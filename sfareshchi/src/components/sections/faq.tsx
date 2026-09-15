import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/reveal";

const FAQS = [
  {
    q: "سفارشچی چطور به دایرکت اینستاگرام وصل می‌شه؟",
    a: "فقط کافیه پیج اینستاگرامت رو به سفارشچی وصل کنی؛ از اون به بعد پیام‌های سفارش خودشون میان توی پنل، بدون نیاز به کپی-پیست دستی.",
  },
  {
    q: "برای استفاده از سفارشچی نیاز به دانش فنی دارم؟",
    a: "نه. سفارشچی برای فروشنده‌های اینستاگرامی ساخته شده، نه برنامه‌نویس‌ها؛ راه‌اندازی‌اش چند دقیقه بیشتر طول نمی‌کشه.",
  },
  {
    q: "پرداخت مشتری‌ها چطور تأیید می‌شه؟",
    a: "لینک پرداخت به‌صورت خودکار برای مشتری ارسال می‌شه و بعد از پرداخت، وضعیت سفارش خودش به‌روزرسانی می‌شه.",
  },
  {
    q: "می‌تونم هر وقت خواستم پلنم رو تغییر بدم یا لغو کنم؟",
    a: "بله، هر زمان می‌تونی پلنت رو ارتقا بدی، پایین بیاری یا لغو کنی؛ بدون قرارداد و تعهد بلندمدت.",
  },
  {
    q: "اطلاعات مشتری‌ها و سفارش‌ها امن می‌مونه؟",
    a: "اطلاعات فروشگاهت فقط برای خودت قابل مشاهده‌ست و با رعایت استانداردهای امنیتی نگه‌داری می‌شه.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="landing-section" style={{ background: "var(--white)" }}>
      <div className="container-x">
        <Reveal className="section-head center">
          <span className="section-kicker">سوالات متداول</span>
          <h2>چیزهایی که معمولاً می‌پرسن</h2>
        </Reveal>

        <Reveal className="faq-list">
          {FAQS.map((faq) => (
            <details key={faq.q} className="faq-item">
              <summary>
                {faq.q}
                <ChevronDown className="chev" size={22} strokeWidth={2} />
              </summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
