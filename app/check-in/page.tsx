import { CheckInPanel } from "@/components/CheckInPanel";

export default function CheckInPage() {
  return <CheckInPanel checkinTokenRequired={Boolean(process.env.CHECKIN_OPERATOR_TOKEN)} />;
}
