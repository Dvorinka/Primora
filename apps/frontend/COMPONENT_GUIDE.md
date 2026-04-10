# Primora Component Quick Reference

A quick reference guide for using Primora's enhanced UI components.

---

## 🚀 Quick Start

```tsx
import {
  Button,
  Card,
  Modal,
  Tooltip,
  Dropdown,
  Progress,
  Tabs,
  toast,
  ToastContainer,
} from "./components";
```

---

## 📦 Components

### Button
```tsx
// Primary action
<Button variant="primary" onClick={handleClick}>
  Create Project
</Button>

// With icon
<Button variant="secondary" icon={<Icons.Plus />}>
  Add Item
</Button>

// Loading state
<Button variant="primary" loading={isSubmitting()}>
  Saving...
</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
```

### Card
```tsx
// Basic card
<Card>
  <CardHeader title="Project Details" />
  <p>Card content goes here</p>
</Card>

// With eyebrow and description
<Card variant="elevated">
  <CardHeader 
    eyebrow="Overview"
    title="Dashboard"
    description="Monitor your metrics"
  />
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter align="right">
    <Button>Action</Button>
  </CardFooter>
</Card>

// Stat card
<StatCard
  label="Total Users"
  value={1234}
  icon={<Icons.Users />}
  trend="up"
  trendValue="+12%"
/>

// Interactive card
<Card variant="interactive" onClick={handleClick}>
  Clickable card
</Card>
```

### Modal
```tsx
const [open, setOpen] = createSignal(false);

<Modal
  open={open()}
  onClose={() => setOpen(false)}
  title="Confirm Action"
  description="Are you sure you want to proceed?"
  size="md"
>
  <p>Modal content</p>
  <ModalFooter align="right">
    <Button variant="secondary" onClick={() => setOpen(false)}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleConfirm}>
      Confirm
    </Button>
  </ModalFooter>
</Modal>
```

### Tooltip
```tsx
<Tooltip content="Delete this item" placement="top">
  <Button variant="ghost" icon={<Icons.Trash />} />
</Tooltip>

// With delay
<Tooltip content="Helpful hint" delay={500}>
  <span>Hover me</span>
</Tooltip>
```

### Dropdown
```tsx
<Dropdown
  trigger={<Button variant="secondary">Actions</Button>}
  placement="bottom-end"
  items={[
    {
      id: "edit",
      label: "Edit",
      icon: <Icons.Edit />,
      onClick: () => handleEdit(),
    },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: <Icons.Copy />,
      onClick: () => handleDuplicate(),
    },
    { id: "divider", divider: true },
    {
      id: "delete",
      label: "Delete",
      icon: <Icons.Trash />,
      danger: true,
      onClick: () => handleDelete(),
    },
  ]}
/>
```

### Progress
```tsx
// Linear progress
<Progress 
  value={75} 
  max={100} 
  showLabel 
  label="Upload Progress"
  variant="success"
/>

// Circular progress
<CircularProgress 
  value={60} 
  showLabel 
  size={80}
  variant="primary"
/>

// Spinner
<Spinner size="md" variant="primary" />
```

### Tabs
```tsx
<Tabs
  variant="pills"
  defaultTab="overview"
  onChange={(tabId) => console.log(tabId)}
  tabs={[
    {
      id: "overview",
      label: "Overview",
      icon: <Icons.Dashboard />,
      content: <OverviewPanel />,
    },
    {
      id: "settings",
      label: "Settings",
      badge: "3",
      content: <SettingsPanel />,
    },
    {
      id: "disabled",
      label: "Disabled",
      disabled: true,
      content: null,
    },
  ]}
/>

// Variants
<Tabs variant="default" tabs={...} />
<Tabs variant="pills" tabs={...} />
<Tabs variant="underline" tabs={...} />
```

### Toast
```tsx
// Add to app root
<ToastContainer />

// Use anywhere
toast.success("Operation successful!");
toast.error("Something went wrong", "Error");
toast.warning("Please review your changes");
toast.info("New update available", undefined, 10000);

// Manual control
const id = toast.show({
  variant: "info",
  message: "Processing...",
  duration: 0, // Won't auto-dismiss
});

// Dismiss manually
toast.dismiss(id);
toast.dismissAll();
```

### Input
```tsx
// Text input
<Input
  label="Project Name"
  placeholder="Enter name"
  value={name()}
  onInput={(e) => setName(e.currentTarget.value)}
  error={errors().name}
/>

// Textarea
<Textarea
  label="Description"
  placeholder="Enter description"
  rows={4}
  value={description()}
  onInput={(e) => setDescription(e.currentTarget.value)}
/>

// Select
<Select
  label="Status"
  value={status()}
  onChange={(e) => setStatus(e.currentTarget.value)}
>
  <option value="active">Active</option>
  <option value="inactive">Inactive</option>
</Select>

// File input
<FileInput
  label="Upload File"
  accept="image/*"
  onChange={(e) => setFile(e.currentTarget.files?.[0])}
/>
```

### Table
```tsx
<Table
  columns={[
    { key: "name", header: "Name", width: "40%" },
    { key: "email", header: "Email" },
    { 
      key: "status", 
      header: "Status",
      render: (value) => <StatusBadge status={value} />
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (_, row) => (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => handleEdit(row)}
        >
          Edit
        </Button>
      ),
    },
  ]}
  data={users()}
  rowKey={(row) => row.id}
  onRowClick={(row) => console.log(row)}
  emptyMessage="No users found"
/>

// With pagination
<DataTable
  columns={columns}
  data={currentPage()}
>
  <Pagination
    currentPage={page()}
    totalPages={totalPages()}
    onPageChange={setPage}
  />
</DataTable>
```

### Badge
```tsx
<Badge variant="primary">New</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="neutral">Draft</Badge>

// Status badge
<StatusBadge status="active" />
<StatusBadge status="pending" />
<StatusBadge status="completed" />
<StatusBadge status="error" />
```

### Message
```tsx
<Message variant="info" title="Information">
  This is an informational message.
</Message>

<Message variant="success" icon={<Icons.Check />}>
  Operation completed successfully!
</Message>

<Message 
  variant="error" 
  dismissible 
  onDismiss={() => setError(null)}
>
  {error()}
</Message>
```

### Layout
```tsx
<Layout
  sidebar={
    <Sidebar
      items={navItems}
      activeId={activeView()}
      onSelect={setActiveView}
      header={<Logo />}
      footer={<UserMenu />}
    />
  }
  header={
    <Header
      title="Dashboard"
      subtitle="Overview"
      actions={<Button>Action</Button>}
    />
  }
>
  <PageHeader
    eyebrow="Overview"
    title="Dashboard"
    description="Monitor your metrics"
    actions={<Button variant="primary">Create</Button>}
  />
  
  {/* Page content */}
</Layout>
```

---

## 🎨 CSS Utilities

### Animations
```tsx
<div class="animate-fade-in">Fade in</div>
<div class="animate-slide-up">Slide up</div>
<div class="animate-scale-in">Scale in</div>
<div class="animate-bounce-in">Bounce in</div>
```

### Effects
```tsx
<Card class="card-hover-lift">Lifts on hover</Card>
<Card class="spotlight">Shine effect</Card>
<div class="glass">Frosted glass</div>
<span class="text-shimmer">Shimmer text</span>
```

### Loading States
```tsx
<div class="skeleton h-4 w-32" />
<div class="skeleton-wave h-20 w-full" />
<SkeletonCard lines={3} />
```

### Stagger Animations
```tsx
<div class="stagger-fade-in">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

---

## 🎯 Common Patterns

### Form with Validation
```tsx
<form onSubmit={handleSubmit} class="space-y-4">
  <Input
    label="Email"
    type="email"
    value={email()}
    onInput={(e) => setEmail(e.currentTarget.value)}
    error={errors().email}
  />
  
  <Input
    label="Password"
    type="password"
    value={password()}
    onInput={(e) => setPassword(e.currentTarget.value)}
    error={errors().password}
  />
  
  <Button 
    type="submit" 
    variant="primary" 
    loading={submitting()}
    class="w-full"
  >
    Sign In
  </Button>
</form>
```

### Confirmation Dialog
```tsx
const [showConfirm, setShowConfirm] = createSignal(false);

<Modal
  open={showConfirm()}
  onClose={() => setShowConfirm(false)}
  title="Confirm Deletion"
  description="This action cannot be undone."
  size="sm"
>
  <ModalFooter align="right">
    <Button 
      variant="secondary" 
      onClick={() => setShowConfirm(false)}
    >
      Cancel
    </Button>
    <Button 
      variant="danger" 
      onClick={handleDelete}
    >
      Delete
    </Button>
  </ModalFooter>
</Modal>
```

### Dashboard Grid
```tsx
<div class="dashboard-grid">
  <StatCard label="Users" value={users()} />
  <StatCard label="Revenue" value={`$${revenue()}`} />
  <StatCard label="Growth" value="+12%" trend="up" />
</div>
```

### Action Menu
```tsx
<Dropdown
  trigger={
    <Button variant="ghost" size="sm">
      <Icons.Menu />
    </Button>
  }
  items={[
    { id: "view", label: "View Details", icon: <Icons.Eye /> },
    { id: "edit", label: "Edit", icon: <Icons.Edit /> },
    { id: "divider", divider: true },
    { id: "delete", label: "Delete", icon: <Icons.Trash />, danger: true },
  ]}
/>
```

### Loading State
```tsx
<Show 
  when={!loading()} 
  fallback={
    <div class="flex items-center justify-center py-12">
      <Spinner size="lg" />
    </div>
  }
>
  {/* Content */}
</Show>
```

### Empty State
```tsx
<EmptyState
  icon={<Icons.Inbox class="h-12 w-12" />}
  title="No projects yet"
  description="Get started by creating your first project"
  action={
    <Button variant="primary" onClick={handleCreate}>
      Create Project
    </Button>
  }
/>
```

---

## 💡 Tips

### Performance
- Use `createMemo` for expensive computations
- Leverage SolidJS fine-grained reactivity
- Avoid unnecessary re-renders
- Use `Show` instead of ternary for conditional rendering

### Accessibility
- Always provide labels for inputs
- Use semantic HTML
- Test keyboard navigation
- Ensure color contrast

### Styling
- Use Tailwind utilities first
- Leverage CSS custom properties for theming
- Keep component styles scoped
- Use consistent spacing

### State Management
- Keep state close to where it's used
- Use signals for reactive state
- Lift state only when necessary
- Consider context for global state

---

## 🔗 Related Files

- `apps/frontend/src/index.css` - Global styles and design tokens
- `apps/frontend/tailwind.config.cjs` - Tailwind configuration
- `FRONTEND_ENHANCEMENTS.md` - Detailed enhancement documentation
- `project_frontend.md` - Design system specification

---

**Happy coding! 🚀**
