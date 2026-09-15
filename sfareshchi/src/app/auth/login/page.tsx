import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "ورود",
  description: "ورود به پنل سفارشچی با شماره موبایل و رمز عبور.",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <LoginForm />;
}
