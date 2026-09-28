export function DashboardLoading() {
  return (
    <div className="dashboard-loading" aria-label="Carregando conteúdo">
      <div className="loading-line loading-line-short" />
      <div className="loading-line loading-line-title" />
      <div className="loading-stat-grid">
        {[1, 2, 3, 4].map((item) => (
          <div className="loading-card" key={item} />
        ))}
      </div>
      <div className="loading-panel" />
    </div>
  );
}
