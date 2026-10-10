const metricCards = Array.from({ length: 4 });
const chartPanels = Array.from({ length: 2 });
const integrationCards = Array.from({ length: 3 });
const quickActions = Array.from({ length: 4 });

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`workspace-skeleton-block ${className}`} />;
}

export function WorkspaceContentSkeleton({ label = "Đang tải nội dung quản trị…" }: { label?: string }) {
  return (
    <div className="workspace-content-skeleton" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>

      <section className="workspace-skeleton-overview" aria-hidden="true">
        <div className="workspace-skeleton-intro">
          <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-short" />
          <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-medium" />
          <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-title" />
          <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-wide" />
        </div>
        <div className="workspace-skeleton-actions">
          <SkeletonBlock className="workspace-skeleton-button workspace-skeleton-button-secondary" />
          <SkeletonBlock className="workspace-skeleton-button workspace-skeleton-button-primary" />
        </div>
      </section>

      <div className="workspace-skeleton-metric-grid" aria-hidden="true">
        {metricCards.map((_, index) => (
          <div className="workspace-skeleton-panel workspace-skeleton-metric" key={index}>
            <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-medium" />
            <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-value" />
            <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-short" />
          </div>
        ))}
      </div>

      <section className="workspace-skeleton-section" aria-hidden="true">
        <div className="workspace-skeleton-section-heading">
          <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-medium" />
          <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-wide" />
        </div>
        <div className="workspace-skeleton-chart-grid">
          {chartPanels.map((_, index) => (
            <div className="workspace-skeleton-panel workspace-skeleton-chart" key={index}>
              <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-medium" />
              <SkeletonBlock className="workspace-skeleton-chart-area" />
            </div>
          ))}
        </div>
      </section>

      <section className="workspace-skeleton-section" aria-hidden="true">
        <div className="workspace-skeleton-section-heading">
          <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-medium" />
          <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-wide" />
        </div>
        <div className="workspace-skeleton-integration-grid">
          {integrationCards.map((_, index) => (
            <div className="workspace-skeleton-panel workspace-skeleton-integration" key={index}>
              <SkeletonBlock className="workspace-skeleton-avatar" />
              <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-medium" />
            </div>
          ))}
        </div>
      </section>

      <section className="workspace-skeleton-section" aria-hidden="true">
        <div className="workspace-skeleton-section-heading">
          <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-medium" />
          <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-wide" />
        </div>
        <div className="workspace-skeleton-action-grid">
          {quickActions.map((_, index) => (
            <div className="workspace-skeleton-panel workspace-skeleton-quick-action" key={index}>
              <SkeletonBlock className="workspace-skeleton-avatar" />
              <SkeletonBlock className="workspace-skeleton-line workspace-skeleton-line-medium" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
