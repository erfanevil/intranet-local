import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ForgotFlow } from "./forgot-flow";

export const metadata: Metadata = {
  title: "بازیابی رمز عبور",
  description: "بازیابی رمز عبور حساب سفارشچی با تأیید شماره موبایل.",
};

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <ForgotFlow />;
}
