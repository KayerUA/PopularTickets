import { TelegramFocalEditor } from "@/app/telegram/focal/TelegramFocalEditor";

type Props = {
  searchParams: Promise<{ draft?: string; event?: string; i?: string }>;
};

export default async function TelegramFocalPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <TelegramFocalEditor
      draftId={sp.draft?.trim() || undefined}
      eventId={sp.event?.trim() || undefined}
      initialIndex={Math.max(0, Number(sp.i ?? "0") || 0)}
    />
  );
}
