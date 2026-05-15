import { CheckInPanel } from "@/components/CheckInPanel";

export default function CheckInPage() {
  return <CheckInPanel checkinTokenRequired={process.env.NODE_ENV === "production" || Boolean(process.env.CHECKIN_OPERATOR_TOKEN)} />;
}
