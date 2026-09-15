import { Check } from "lucide-react";
import { InstagramIcon } from "@/components/icons";
import { Reveal } from "@/components/reveal";

const POINTS = [
  "کارت محصول با عکس، رنگ، سایز و قیمت، درست وسط چت",
  "ثبت آدرس و پرداخت، بدون خروج از اپلیکیشن اینستاگرام",
  "تأیید نهایی سفارش، همون لحظه برای مشتری نمایش داده می‌شه",
];

export function DmMockup() {
  return (
    <section className="dm-section landing-section" id="dm">
      <div className="container-x dm-wrap">
        <div className="dm-copy">
          <Reveal className="section-head">
            <span className="section-kicker">خرید در دایرکت</span>
            <h2>خرید، همون‌جا توی دایرکت</h2>
            <p>
              مشتری نیازی نداره از اینستاگرام بیرون بیاد؛ از انتخاب محصول تا
              پرداخت، همه‌چیز توی همون گفت‌وگو انجام می‌شه.
            </p>
          </Reveal>
          <ul className="dm-points">
            {POINTS.map((point) => (
              <li key={point}>
                <Check size={20} strokeWidth={2.2} />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <Reveal
          className="dm-mock"
          delay={0.12}
          aria-label="نمونه گفت‌وگوی خرید در دایرکت اینستاگرام شامل انتخاب محصول، ثبت آدرس و تأیید پرداخت"
        >
          <div className="dm-mock-head">
            <div className="dm-mock-avatar">
              <InstagramIcon width={22} height={22} strokeWidth={1.8} style={{ color: "#fff" }} />
            </div>
            <div>
              <div className="dm-mock-title">sefarshchi</div>
              <div className="dm-mock-sub">گفت‌وگوی کسب‌وکار</div>
            </div>
          </div>

          <div className="dm-bubble in">سلام، کد ۱۴۶ رو می‌خوام</div>

          <div className="dm-product-card">
            <div className="thumb" />
            <div className="pname">کفش اسپرت مدل ۱۴۶</div>
            <div className="pprice">۱,۲۸۵,۰۰۰ تومان</div>
          </div>

          <div className="dm-bubble in">آدرس رو کجا بفرستم؟</div>
          <div className="dm-bubble out">آدرستون رو همین‌جا وارد کنید</div>

          <div className="dm-chip">
            <Check size={14} strokeWidth={2.6} />
            پرداخت تأیید شد
          </div>
        </Reveal>
      </div>
    </section>
  );
}
