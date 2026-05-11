export default function CheckInLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 min-h-dvh overflow-x-hidden bg-poet-bg font-sans antialiased">
      <div className="poet-curtain" aria-hidden />
      {children}
    </div>
  );
}
