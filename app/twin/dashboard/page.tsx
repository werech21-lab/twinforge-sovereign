import { redirect } from "next/navigation";

/** مسار سيادي موحّد → لوحة التحكم الحالية */
export default function TwinDashboardAliasPage() {
  redirect("/dashboard");
}
