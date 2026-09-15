import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RegisterFlow } from "./register-flow";

export const metadata: Metadata = {
  title: "ثبت‌نام",
  description: "ساخت حساب سفارشچی فقط با شماره موبایل؛ سریع و بدون ایمیل.",
};

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <RegisterFlow />;
}
