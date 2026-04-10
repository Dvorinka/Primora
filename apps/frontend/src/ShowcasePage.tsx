import { For, createSignal } from "solid-js";
import { Button, Card, CardHeader, Badge, Progress, Tabs, StatCard } from "./components";

export function ShowcasePage() {
  const [activeTab, setActiveTab] = createSignal("components");

  const stats = [
    { label: "Active Users", value: "1,247", trend: "up" as const, trendValue: "+12%" },
    { label: "Storage Used", value: "847 GB", trend: "up" as const, trendValue: "+8%" },
    { label: "API Requests", value: "2.4M", trend: "up" as const, trendValue: "+45%" },
    { label: "Projects", value: "23", trend: "neutral" as const },
  ];

  const tableData = [
    { name: "Authentication Service", status: "active", uptime: "99.9%", requests: "1.2M" },
    { name: "Storage API", status: "active", uptime: "99.8%", requests: "847K" },
    { name: "Database", status: "active", uptime: "100%", requests: "2.1M" },
    { name: "Cache Layer", status: "degraded", uptime: "98.2%", requests: "3.4M" },
  ];

  return (
    <div class="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] p-8">
      <div class="max-w-7xl mx-auto space-y-12">
        {/* Hero Section */}
        <div class="space-y-4 animate-fade-in">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-muted)] border border-[var(--accent)] text-[var(--accent)] text-sm font-medium">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            Design System v1.0
          </div>
          <h1 class="text-5xl font-bold tracking-tight">
            Primora Design System
          </h1>
          <p class="text-xl text-[var(--text-secondary)] max-w-2xl">
            A refined, dark-first UI system built for developers. Clean, accessible, and production-ready.
          </p>
        </div>

        {/* Stats Grid */}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <For each={stats}>
            {(stat) => (
              <StatCard
                label={stat.label}
                value={stat.value}
                trend={stat.trend}
                trendValue={stat.trendValue}
              />
            )}
          </For>
        </div>

        {/* Tabs Section */}
        <Card>
          <Tabs
            tabs={[
              { id: "components", label: "Components" },
              { id: "colors", label: "Colors" },
              { id: "typography", label: "Typography" },
            ]}
            activeTab={activeTab()}
            onChange={setActiveTab}
          />

          <div class="mt-6">
            {activeTab() === "components" && (
              <div class="space-y-8">
                {/* Buttons */}
                <div>
                  <h3 class="text-lg font-semibold mb-4">Buttons</h3>
                  <div class="flex flex-wrap gap-3">
                    <Button variant="primary">Primary Button</Button>
                    <Button variant="secondary">Secondary Button</Button>
                    <Button variant="ghost">Ghost Button</Button>
                    <Button variant="danger">Danger Button</Button>
                    <Button variant="primary" size="sm">Small</Button>
                    <Button variant="primary" size="lg">Large</Button>
                    <Button variant="primary" loading>Loading...</Button>
                  </div>
                </div>

                {/* Badges */}
                <div>
                  <h3 class="text-lg font-semibold mb-4">Badges</h3>
                  <div class="flex flex-wrap gap-3">
                    <Badge variant="primary">Primary</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="error">Error</Badge>
                    <Badge variant="neutral">Neutral</Badge>
                  </div>
                </div>

                {/* Progress Bars */}
                <div>
                  <h3 class="text-lg font-semibold mb-4">Progress Indicators</h3>
                  <div class="space-y-4">
                    <Progress value={75} showLabel label="CPU Usage" />
                    <Progress value={60} showLabel label="Memory" />
                    <Progress value={90} showLabel label="Disk Space" variant="warning" />
                  </div>
                </div>

                {/* Table */}
                <div>
                  <h3 class="text-lg font-semibold mb-4">Data Table</h3>
                  <div class="table-container">
                    <table class="table">
                      <thead>
                        <tr>
                          <th>Service</th>
                          <th>Status</th>
                          <th>Uptime</th>
                          <th>Requests</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={tableData}>
                          {(row) => (
                            <tr>
                              <td class="font-medium">{row.name}</td>
                              <td>
                                <Badge variant={row.status === "active" ? "success" : "warning"}>
                                  {row.status}
                                </Badge>
                              </td>
                              <td class="text-[var(--text-secondary)]">{row.uptime}</td>
                              <td class="font-mono text-sm">{row.requests}</td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab() === "colors" && (
              <div class="space-y-6">
                <div>
                  <h3 class="text-lg font-semibold mb-4">Accent Color</h3>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="space-y-2">
                      <div class="h-20 rounded-lg bg-[var(--accent)] border border-[var(--border)]" />
                      <p class="text-sm font-mono text-[var(--text-secondary)]">#19a3d9</p>
                      <p class="text-xs text-[var(--text-muted)]">Primary Accent</p>
                    </div>
                    <div class="space-y-2">
                      <div class="h-20 rounded-lg bg-[var(--accent-hover)] border border-[var(--border)]" />
                      <p class="text-sm font-mono text-[var(--text-secondary)]">#22b8f0</p>
                      <p class="text-xs text-[var(--text-muted)]">Hover State</p>
                    </div>
                    <div class="space-y-2">
                      <div class="h-20 rounded-lg bg-[var(--accent-muted)] border border-[var(--border)]" />
                      <p class="text-sm font-mono text-[var(--text-secondary)]">rgba(25, 163, 217, 0.08)</p>
                      <p class="text-xs text-[var(--text-muted)]">Muted</p>
                    </div>
                    <div class="space-y-2">
                      <div class="h-20 rounded-lg bg-[var(--accent-subtle)] border border-[var(--border)]" />
                      <p class="text-sm font-mono text-[var(--text-secondary)]">rgba(25, 163, 217, 0.12)</p>
                      <p class="text-xs text-[var(--text-muted)]">Subtle</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 class="text-lg font-semibold mb-4">Status Colors</h3>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="space-y-2">
                      <div class="h-20 rounded-lg bg-[var(--success)] border border-[var(--border)]" />
                      <p class="text-sm font-mono text-[var(--text-secondary)]">#22c55e</p>
                      <p class="text-xs text-[var(--text-muted)]">Success</p>
                    </div>
                    <div class="space-y-2">
                      <div class="h-20 rounded-lg bg-[var(--warning)] border border-[var(--border)]" />
                      <p class="text-sm font-mono text-[var(--text-secondary)]">#f59e0b</p>
                      <p class="text-xs text-[var(--text-muted)]">Warning</p>
                    </div>
                    <div class="space-y-2">
                      <div class="h-20 rounded-lg bg-[var(--error)] border border-[var(--border)]" />
                      <p class="text-sm font-mono text-[var(--text-secondary)]">#ef4444</p>
                      <p class="text-xs text-[var(--text-muted)]">Error</p>
                    </div>
                    <div class="space-y-2">
                      <div class="h-20 rounded-lg bg-[var(--info)] border border-[var(--border)]" />
                      <p class="text-sm font-mono text-[var(--text-secondary)]">#3b82f6</p>
                      <p class="text-xs text-[var(--text-muted)]">Info</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 class="text-lg font-semibold mb-4">Surface Colors</h3>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="space-y-2">
                      <div class="h-20 rounded-lg bg-[var(--bg-main)] border border-[var(--border)]" />
                      <p class="text-sm font-mono text-[var(--text-secondary)]">#131315</p>
                      <p class="text-xs text-[var(--text-muted)]">Background</p>
                    </div>
                    <div class="space-y-2">
                      <div class="h-20 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]" />
                      <p class="text-sm font-mono text-[var(--text-secondary)]">#1d1d21</p>
                      <p class="text-xs text-[var(--text-muted)]">Surface 1</p>
                    </div>
                    <div class="space-y-2">
                      <div class="h-20 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]" />
                      <p class="text-sm font-mono text-[var(--text-secondary)]">#2d2d31</p>
                      <p class="text-xs text-[var(--text-muted)]">Surface 2</p>
                    </div>
                    <div class="space-y-2">
                      <div class="h-20 rounded-lg bg-[var(--surface-3)] border border-[var(--border)]" />
                      <p class="text-sm font-mono text-[var(--text-secondary)]">#4a4a4d</p>
                      <p class="text-xs text-[var(--text-muted)]">Surface 3</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab() === "typography" && (
              <div class="space-y-8">
                <div>
                  <h3 class="text-lg font-semibold mb-4">Headings</h3>
                  <div class="space-y-4">
                    <div>
                      <h1 class="mb-1">Heading 1</h1>
                      <p class="text-sm text-[var(--text-muted)] font-mono">2rem / 32px - Bold</p>
                    </div>
                    <div>
                      <h2 class="mb-1">Heading 2</h2>
                      <p class="text-sm text-[var(--text-muted)] font-mono">1.5rem / 24px - Semibold</p>
                    </div>
                    <div>
                      <h3 class="mb-1">Heading 3</h3>
                      <p class="text-sm text-[var(--text-muted)] font-mono">1.25rem / 20px - Semibold</p>
                    </div>
                    <div>
                      <h4 class="mb-1">Heading 4</h4>
                      <p class="text-sm text-[var(--text-muted)] font-mono">1.125rem / 18px - Semibold</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 class="text-lg font-semibold mb-4">Body Text</h3>
                  <div class="space-y-4">
                    <div>
                      <p class="text-[var(--text-primary)] mb-1">
                        Primary text color - used for main content and headings
                      </p>
                      <p class="text-sm text-[var(--text-muted)] font-mono">var(--text-primary) #ededf0</p>
                    </div>
                    <div>
                      <p class="text-[var(--text-secondary)] mb-1">
                        Secondary text color - used for supporting content
                      </p>
                      <p class="text-sm text-[var(--text-muted)] font-mono">var(--text-secondary) #bebec4</p>
                    </div>
                    <div>
                      <p class="text-[var(--text-muted)] mb-1">
                        Muted text color - used for labels and metadata
                      </p>
                      <p class="text-sm text-[var(--text-muted)] font-mono">var(--text-muted) #5b5b5f</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 class="text-lg font-semibold mb-4">Code & Monospace</h3>
                  <div class="space-y-4">
                    <div>
                      <p class="mb-2">Inline code: <code>const value = "example";</code></p>
                    </div>
                    <div class="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-4">
                      <pre class="font-mono text-sm text-[var(--text-secondary)]">
{`function greet(name: string) {
  return \`Hello, \${name}!\`;
}

const message = greet("Primora");
console.log(message);`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Design Principles */}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div class="space-y-3">
              <div class="w-12 h-12 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
                <svg class="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold">Fast & Responsive</h3>
              <p class="text-sm text-[var(--text-secondary)]">
                Built with performance in mind. Smooth transitions and instant feedback.
              </p>
            </div>
          </Card>

          <Card>
            <div class="space-y-3">
              <div class="w-12 h-12 rounded-lg bg-[var(--success-muted)] flex items-center justify-center">
                <svg class="w-6 h-6 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold">Accessible</h3>
              <p class="text-sm text-[var(--text-secondary)]">
                WCAG AA compliant with full keyboard navigation and screen reader support.
              </p>
            </div>
          </Card>

          <Card>
            <div class="space-y-3">
              <div class="w-12 h-12 rounded-lg bg-[var(--warning-muted)] flex items-center justify-center">
                <svg class="w-6 h-6 text-[var(--warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold">Customizable</h3>
              <p class="text-sm text-[var(--text-secondary)]">
                CSS variables make it easy to adapt the design system to your brand.
              </p>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div class="text-center py-8 border-t border-[var(--border)]">
          <p class="text-[var(--text-secondary)]">
            Built with SolidJS, TypeScript, and Tailwind CSS
          </p>
          <p class="text-sm text-[var(--text-muted)] mt-2">
            Primora Design System v1.0 - Dark-first, refined, developer-focused
          </p>
        </div>
      </div>
    </div>
  );
}
