import Link from "next/link";
import { Reveal } from "@/components/reveal";

export function FinalCta() {
  return (
    <section id="cta" className="landing-section">
      <div className="container-x">
        <Reveal className="final-cta">
          <h2>فروشگاهت رو همین امروز به دایرکت وصل کن</h2>
          <p>راه‌اندازی سفارشچی چند دقیقه طول می‌کشه و شروعش رایگانه.</p>
          <Link href="/auth/register" className="btn btn-light">
            شروع رایگان
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
