import { CheckInPanel } from "@/components/CheckInPanel";
import { checkinAuthRequired, isCheckinSessionActive } from "@/lib/checkinSession";

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const authRequired = checkinAuthRequired();
  const authenticated = await isCheckinSessionActive();

  return (
    <CheckInPanel
      authRequired={authRequired}
      authenticated={authenticated}
      loginError={error}
    />
  );
}
