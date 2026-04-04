interface AdminHeaderProps {
  title: string;
}

export default function AdminHeader({ title }: AdminHeaderProps) {
  return (
    <header
      className="border-b px-6 py-4 flex items-center justify-between"
      style={{ borderColor: "var(--color-accent)", backgroundColor: "#fff" }}
    >
      <h1 className="text-lg font-semibold" style={{ color: "var(--color-primary)" }}>
        {title}
      </h1>
      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        Vienna Glow Studio
      </span>
    </header>
  );
}
