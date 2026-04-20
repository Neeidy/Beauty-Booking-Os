interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export default function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  return (
    <header className="dash-header">
      <div>
        <h3>{title}</h3>
        {subtitle && <div className="dash-date">{subtitle}</div>}
      </div>
      <div className="dash-header-right">
        <div className="dash-avatar">A</div>
      </div>
    </header>
  );
}
