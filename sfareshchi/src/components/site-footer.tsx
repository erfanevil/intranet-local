import Link from "next/link";
import { CreditCard, ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container-x">
        <div className="footer-top">
          <div className="footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo.png" alt="سفارشچی" />
            <p>سفارشچی، فروش از دایرکت رو ساده می‌کنه؛ از دریافت سفارش تا ارسال.</p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h4>محصول</h4>
              <ul>
                <li>
                  <Link href="/#features">امکانات</Link>
                </li>
                <li>
                  <Link href="/#how">نحوه کار</Link>
                </li>
                <li>
                  <Link href="/#pricing">قیمت‌گذاری</Link>
                </li>
                <li>
                  <Link href="/#faq">سوالات متداول</Link>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>پشتیبانی</h4>
              <ul>
                <li>
                  <Link href="/track">پیگیری سفارش</Link>
                </li>
                <li>
                  <Link href="/track">تماس با ما</Link>
                </li>
                <li>
                  <Link href="/auth/register">مرکز راهنما</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="trust-row">
          <div className="trust-placeholder">
            <ShieldCheck size={18} strokeWidth={1.6} />
            جایگاه نماد اعتماد الکترونیکی
          </div>
          <div className="trust-placeholder">
            <CreditCard size={18} strokeWidth={1.6} />
            جایگاه درگاه پرداخت
          </div>
        </div>

        <div className="footer-bottom">
          <span>© ۱۴۰۴ سفارشچی. تمامی حقوق محفوظ است.</span>
          <span>ساخته‌شده برای فروشنده‌های اینستاگرامی ایران</span>
        </div>
      </div>
    </footer>
  );
}
