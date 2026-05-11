export default function CheckInLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-poet-bg font-sans antialiased">
      <div className="poet-grain" aria-hidden />
      {children}
    </div>
  );
}
