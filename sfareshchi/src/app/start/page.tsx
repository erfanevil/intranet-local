import { redirect } from "next/navigation";

/** Legacy entry point — "شروع رایگان" now goes through phone registration. */
export default function StartPage() {
  redirect("/auth/register");
}
