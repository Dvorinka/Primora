import { For } from "solid-js";
import { Logo } from "../components/Logo";
import { Button } from "../components/Button";
import { Card, CardHeader, StatCard } from "../components/Card";
import { Input, Textarea, Select } from "../components/Input";
import { Badge, StatusBadge } from "../components/Badge";
import { Message, Loading, Skeleton } from "../components/Message";
import { Table } from "../components/Table";

export function EnhancementsShowcase() {
  const sampleData = [
    { id: 1, name: "Project Alpha", status: "active", users: 42 },
    { id: 2, name: "Project Beta", status: "pending", users: 18 },
    { id: 3, name: "Project Gamma", status: "completed", users: 156 },
  ];

  const columns = [
    { key: "name", header: "Project Name" },
    { key: "status", header: "Status", render: (val: string) => <StatusBadge status={val as any} /> },
    { key: "users", header: "Users", align: "right" as const },
  ];

  return (
    <div class="min-h-screen bg-bg-main p-8">
      <div class="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div class="text-center space-y-4 animate-fade-in">
          <div class="flex justify-center mb-6">
            <Logo size="lg" animated />
          </div>
          <h1 class="text-5xl font-display font-extrabold">
            Enhanced Design System
          </h1>
          <p class="text-lg text-text-secondary max-w-2xl mx-auto">
            A distinctive, production-grade UI system with sophisticated micro-interactions,
            refined typography, and purposeful animations.
          </p>
        </div>

        {/* Typography Section */}
        <section class="space-y-6 animate-slide-up stagger-1">
          <div class="section-eyebrow">Typography</div>
          <h2 class="section-title">Distinctive Font System</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card class="card-premium">
              <h3 class="font-display text-2xl font-bold mb-2">Syne Display</h3>
              <p class="text-text-secondary text-sm">
                Bold, geometric display font for headings and brand elements
              </p>
            </Card>
            <Card class="card-premium">
              <h3 class="font-sans text-2xl font-semibold mb-2">DM Sans Body</h3>
              <p class="text-text-secondary text-sm">
                Clean, readable sans-serif for body text and UI elements
              </p>
            </Card>
            <Card class="card-premium">
              <h3 class="font-mono text-xl font-medium mb-2">JetBrains Mono</h3>
              <p class="text-text-secondary text-sm">
                Professional monospace for code and technical content
              </p>
            </Card>
          </div>
        </section>

        {/* Buttons Section */}
        <section class="space-y-6 animate-slide-up stagger-2">
          <div class="section-eyebrow">Interactive Elements</div>
          <h2 class="section-title">Enhanced Buttons</h2>
          <div class="flex flex-wrap gap-4">
            <Button variant="primary" class="btn-glow">
              Primary Action
            </Button>
            <Button variant="secondary">
              Secondary Action
            </Button>
            <Button variant="ghost">
              Ghost Button
            </Button>
            <Button variant="danger">
              Danger Action
            </Button>
            <Button variant="primary" loading>
              Loading...
            </Button>
          </div>
        </section>

        {/* Cards Section */}
        <section class="space-y-6 animate-slide-up stagger-3">
          <div class="section-eyebrow">Data Display</div>
          <h2 class="section-title">Stat Cards with Animations</h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="stat-card-enhanced">
              <p class="stat-label">Total Users</p>
              <p class="stat-value-animated">2,847</p>
              <p class="text-xs text-success mt-2">↑ 12.5% from last month</p>
            </div>
            <div class="stat-card-enhanced">
              <p class="stat-label">Active Projects</p>
              <p class="stat-value-animated">42</p>
              <p class="text-xs text-accent mt-2">→ Stable</p>
            </div>
            <div class="stat-card-enhanced">
              <p class="stat-label">Storage Used</p>
              <p class="stat-value-animated">156 GB</p>
              <p class="text-xs text-warning mt-2">↑ 8.2% from last month</p>
            </div>
            <div class="stat-card-enhanced">
              <p class="stat-label">API Calls</p>
              <p class="stat-value-animated">1.2M</p>
              <p class="text-xs text-success mt-2">↑ 24.1% from last month</p>
            </div>
          </div>
        </section>

        {/* Forms Section */}
        <section class="space-y-6 animate-slide-up stagger-4">
          <div class="section-eyebrow">Form Elements</div>
          <h2 class="section-title">Enhanced Inputs</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card class="card-premium">
              <div class="space-y-4">
                <div class="input-enhanced">
                  <Input label="Project Name" placeholder="Enter project name..." />
                </div>
                <div class="input-enhanced">
                  <Select label="Project Type" options={[
                    { value: "web", label: "Web Application" },
                    { value: "mobile", label: "Mobile App" },
                    { value: "api", label: "API Service" },
                  ]} />
                </div>
                <div class="input-enhanced">
                  <Textarea label="Description" placeholder="Describe your project..." />
                </div>
              </div>
            </Card>
            <Card class="card-premium">
              <CardHeader 
                eyebrow="Form States"
                title="Interactive Feedback"
                description="Hover and focus states with smooth animations"
              />
              <div class="space-y-4 mt-4">
                <Badge variant="primary" class="badge-animated">Active</Badge>
                <Badge variant="success" class="badge-animated">Completed</Badge>
                <Badge variant="warning" class="badge-animated">Pending</Badge>
                <Badge variant="error" class="badge-animated">Error</Badge>
              </div>
            </Card>
          </div>
        </section>

        {/* Messages Section */}
        <section class="space-y-6 animate-slide-up stagger-5">
          <div class="section-eyebrow">Feedback</div>
          <h2 class="section-title">Messages & Alerts</h2>
          <div class="space-y-4">
            <Message variant="success" title="Success!">
              Your project has been created successfully.
            </Message>
            <Message variant="info" title="Information">
              New features are available in the latest update.
            </Message>
            <Message variant="warning" title="Warning">
              Your storage is almost full. Consider upgrading your plan.
            </Message>
            <Message variant="error" title="Error">
              Failed to connect to the server. Please try again.
            </Message>
          </div>
        </section>

        {/* Table Section */}
        <section class="space-y-6 animate-slide-up stagger-6">
          <div class="section-eyebrow">Data Tables</div>
          <h2 class="section-title">Enhanced Table Component</h2>
          <Card class="card-premium">
            <div class="table-enhanced">
              <Table
                columns={columns}
                data={sampleData}
                rowKey={(row) => row.id}
              />
            </div>
          </Card>
        </section>

        {/* Loading States */}
        <section class="space-y-6 animate-slide-up">
          <div class="section-eyebrow">Loading States</div>
          <h2 class="section-title">Skeleton & Spinners</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <Skeleton width="60%" height="20px" class="mb-3" />
              <Skeleton width="100%" height="14px" class="mb-2" />
              <Skeleton width="100%" height="14px" class="mb-2" />
              <Skeleton width="80%" height="14px" />
            </Card>
            <Card class="flex items-center justify-center">
              <Loading text="Loading data..." size="lg" />
            </Card>
            <Card class="flex items-center justify-center">
              <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer class="text-center py-12 border-t border-border">
          <p class="text-text-muted text-sm">
            PRIMORA Enhanced Design System — Production-grade UI components
          </p>
        </footer>
      </div>
    </div>
  );
}
