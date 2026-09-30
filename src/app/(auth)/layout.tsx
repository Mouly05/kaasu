export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="bg-background relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,var(--color-emerald-500)/0.12,transparent_70%)]"
      />
      <div className="relative w-full max-w-sm">{children}</div>
    </main>
  );
}
