# Primora Frontend Migration Guide

## Overview

This guide helps you migrate from the previous component patterns to the new enhanced component library.

---

## No Breaking Changes! 🎉

Good news: **All enhancements are backward compatible**. Your existing code will continue to work without modifications. This guide shows you how to leverage the new features.

---

## New Components Available

### 1. Replace Custom Modals with Modal Component

**Before:**
```tsx
<Show when={showDialog()}>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div class="bg-surface-1 rounded-lg p-6 max-w-md">
      <h2>Confirm Action</h2>
      <p>Are you sure?</p>
      <div class="flex gap-3 mt-4">
        <button onClick={() => setShowDialog(false)}>Cancel</button>
        <button onClick={handleConfirm}>Confirm</button>
      </div>
    </div>
  </div>
</Show>
```

**After:**
```tsx
<Modal
  open={showDialog()}
  onClose={() => setShowDialog(false)}
  title="Confirm Action"
  description="Are you sure?"
  size="md"
>
  <ModalFooter align="right">
    <Button variant="secondary" onClick={() => setShowDialog(false)}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleConfirm}>
      Confirm
    </Button>
  </ModalFooter>
</Modal>
```

**Benefits:**
- Automatic backdrop blur
- ESC key support
- Click outside to close
- Proper z-index management
- Smooth animations
- Accessibility built-in

---

### 2. Add Tooltips to Icon Buttons

**Before:**
```tsx
<Button variant="ghost" icon={<Icons.Trash />} />
```

**After:**
```tsx
<Tooltip content="Delete this item" placement="top">
  <Button variant="ghost" icon={<Icons.Trash />} />
</Tooltip>
```

**Benefits:**
- Better UX with contextual help
- Smart positioning
- Keyboard accessible
- Configurable delay

---

### 3. Replace Custom Dropdowns with Dropdown Component

**Before:**
```tsx
<Show when={showMenu()}>
  <div class="absolute bg-surface-1 rounded-lg shadow-lg">
    <button onClick={handleEdit}>Edit</button>
    <button onClick={handleDelete}>Delete</button>
  </div>
</Show>
```

**After:**
```tsx
<Dropdown
  trigger={<Button variant="secondary">Actions</Button>}
  items={[
    { id: "edit", label: "Edit", icon: <Icons.Edit />, onClick: handleEdit },
    { id: "divider", divider: true },
    { id: "delete", label: "Delete", icon: <Icons.Trash />, danger: true, onClick: handleDelete },
  ]}
/>
```

**Benefits:**
- Smart positioning
- Click outside to close
- Keyboard navigation
- Icon support
- Danger states
- Dividers

---

### 4. Use Toast Instead of Custom Alerts

**Before:**
```tsx
<Show when={message()}>
  <div class="fixed bottom-4 right-4 bg-success-muted p-4 rounded-lg">
    {message()}
  </div>
</Show>
```

**After:**
```tsx
// Add once to app root
<ToastContainer />

// Use anywhere
toast.success("Operation successful!");
toast.error("Something went wrong");
toast.info("New update available");
```

**Benefits:**
- Global API
- Auto-dismiss
- Stacked notifications
- Multiple variants
- Smooth animations

---

### 5. Add Loading States with Progress

**Before:**
```tsx
<Show when={loading()}>
  <div class="spinner" />
</Show>
```

**After:**
```tsx
// Spinner
<Spinner size="lg" variant="primary" />

// Progress bar
<Progress value={uploadProgress()} showLabel label="Uploading..." />

// Circular progress
<CircularProgress value={60} showLabel />
```

**Benefits:**
- Multiple variants
- Size options
- Label support
- Smooth animations

---

### 6. Use Tabs for Multi-Section Views

**Before:**
```tsx
<div class="flex gap-2 border-b">
  <button
    class={activeTab() === "overview" ? "border-b-2 border-accent" : ""}
    onClick={() => setActiveTab("overview")}
  >
    Overview
  </button>
  <button
    class={activeTab() === "settings" ? "border-b-2 border-accent" : ""}
    onClick={() => setActiveTab("settings")}
  >
    Settings
  </button>
</div>
<Show when={activeTab() === "overview"}>
  <OverviewPanel />
</Show>
<Show when={activeTab() === "settings"}>
  <SettingsPanel />
</Show>
```

**After:**
```tsx
<Tabs
  variant="underline"
  defaultTab="overview"
  tabs={[
    { id: "overview", label: "Overview", icon: <Icons.Dashboard />, content: <OverviewPanel /> },
    { id: "settings", label: "Settings", badge: "3", content: <SettingsPanel /> },
  ]}
  onChange={(tabId) => console.log(tabId)}
/>
```

**Benefits:**
- Multiple variants (default, pills, underline)
- Icon and badge support
- Disabled states
- Smooth transitions
- Keyboard navigation

---

## Enhanced Components

### Button Enhancements

**New Features:**
```tsx
// Loading state
<Button variant="primary" loading={submitting()}>
  Saving...
</Button>

// Icon positioning
<Button icon={<Icons.Plus />} iconPosition="left">
  Create
</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

---

### Card Enhancements

**New Features:**
```tsx
// Elevated variant
<Card variant="elevated">
  <CardHeader eyebrow="Overview" title="Dashboard" description="Monitor metrics" />
  <CardContent>...</CardContent>
  <CardFooter align="right">
    <Button>Action</Button>
  </CardFooter>
</Card>

// Interactive card
<Card variant="interactive" onClick={handleClick}>
  Clickable card
</Card>

// Stat card
<StatCard
  label="Total Users"
  value={1234}
  icon={<Icons.Users />}
  trend="up"
  trendValue="+12%"
/>

// Hover effects
<Card class="card-hover-lift spotlight">
  Interactive card with effects
</Card>
```

---

### Input Enhancements

**New Features:**
```tsx
// Error states
<Input
  label="Email"
  value={email()}
  onInput={(e) => setEmail(e.currentTarget.value)}
  error={errors().email}
/>

// Sizes
<Input size="sm" placeholder="Small input" />
<Input size="md" placeholder="Medium input" />
<Input size="lg" placeholder="Large input" />
```

---

## New CSS Utilities

### Animations

```tsx
// Fade in
<div class="animate-fade-in">Content</div>

// Slide animations
<div class="animate-slide-up">Slide from bottom</div>
<div class="animate-slide-down">Slide from top</div>
<div class="animate-slide-left">Slide from right</div>
<div class="animate-slide-right">Slide from left</div>

// Scale and bounce
<div class="animate-scale-in">Scale in</div>
<div class="animate-bounce-in">Bounce in</div>

// Stagger children
<div class="stagger-fade-in">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

---

### Visual Effects

```tsx
// Card effects
<Card class="card-hover-lift">Lifts on hover</Card>
<Card class="spotlight">Shine effect</Card>

// Glass effect
<div class="glass">Frosted glass background</div>

// Text effects
<span class="text-shimmer">Shimmer text</span>
<span class="neon-glow">Neon glow</span>
<span class="gradient-text">Gradient text</span>

// Loading states
<div class="skeleton h-4 w-32" />
<div class="skeleton-wave h-20 w-full" />
<SkeletonCard lines={3} />
```

---

## Common Migration Patterns

### 1. Confirmation Dialogs

**Before:**
```tsx
const [showConfirm, setShowConfirm] = createSignal(false);

<Show when={showConfirm()}>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div class="bg-surface-1 rounded-lg p-6">
      <h3>Confirm Deletion</h3>
      <p>This action cannot be undone.</p>
      <div class="flex gap-3 mt-4">
        <button onClick={() => setShowConfirm(false)}>Cancel</button>
        <button onClick={handleDelete}>Delete</button>
      </div>
    </div>
  </div>
</Show>
```

**After:**
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
    <Button variant="secondary" onClick={() => setShowConfirm(false)}>
      Cancel
    </Button>
    <Button variant="danger" onClick={handleDelete}>
      Delete
    </Button>
  </ModalFooter>
</Modal>
```

---

### 2. Action Menus

**Before:**
```tsx
<button onClick={() => setShowMenu(!showMenu())}>•••</button>
<Show when={showMenu()}>
  <div class="absolute bg-surface-1 rounded-lg shadow-lg">
    <button onClick={handleEdit}>Edit</button>
    <button onClick={handleDelete}>Delete</button>
  </div>
</Show>
```

**After:**
```tsx
<Dropdown
  trigger={<Button variant="ghost" size="sm">•••</Button>}
  items={[
    { id: "view", label: "View Details", icon: <Icons.Eye /> },
    { id: "edit", label: "Edit", icon: <Icons.Edit /> },
    { id: "divider", divider: true },
    { id: "delete", label: "Delete", icon: <Icons.Trash />, danger: true },
  ]}
/>
```

---

### 3. Loading States

**Before:**
```tsx
<Show when={!loading()} fallback={<div class="spinner" />}>
  {/* Content */}
</Show>
```

**After:**
```tsx
<Show when={!loading()} fallback={<Spinner size="lg" />}>
  {/* Content */}
</Show>

// Or with progress
<Show when={!loading()} fallback={
  <div class="flex flex-col items-center gap-4">
    <Spinner size="lg" />
    <Progress value={progress()} showLabel />
  </div>
}>
  {/* Content */}
</Show>
```

---

### 4. Form Submissions

**Before:**
```tsx
<form onSubmit={handleSubmit}>
  <input
    type="text"
    value={name()}
    onInput={(e) => setName(e.currentTarget.value)}
  />
  <button type="submit" disabled={submitting()}>
    {submitting() ? "Saving..." : "Save"}
  </button>
</form>
```

**After:**
```tsx
<form onSubmit={handleSubmit} class="space-y-4">
  <Input
    label="Name"
    value={name()}
    onInput={(e) => setName(e.currentTarget.value)}
    error={errors().name}
  />
  <Button type="submit" variant="primary" loading={submitting()}>
    Save
  </Button>
</form>
```

---

### 5. Success/Error Messages

**Before:**
```tsx
<Show when={successMessage()}>
  <div class="bg-success-muted text-success p-4 rounded-lg">
    {successMessage()}
  </div>
</Show>
```

**After:**
```tsx
// Option 1: Message component
<Show when={successMessage()}>
  <Message variant="success" dismissible onDismiss={() => setSuccessMessage("")}>
    {successMessage()}
  </Message>
</Show>

// Option 2: Toast (recommended)
toast.success(successMessage());
```

---

## Step-by-Step Migration

### Phase 1: Add ToastContainer
```tsx
// In your App.tsx or main component
import { ToastContainer } from "./components";

export default function App() {
  return (
    <>
      <ToastContainer />
      {/* Rest of your app */}
    </>
  );
}
```

### Phase 2: Replace Alerts with Toasts
Replace all custom alert/message displays with toast notifications.

### Phase 3: Add Tooltips
Add tooltips to icon-only buttons for better UX.

### Phase 4: Replace Custom Modals
Migrate custom modal implementations to the Modal component.

### Phase 5: Add Dropdowns
Replace custom dropdown menus with the Dropdown component.

### Phase 6: Enhance Forms
Add loading states, error handling, and progress indicators to forms.

### Phase 7: Add Tabs
Replace custom tab implementations with the Tabs component.

---

## Best Practices

### 1. Use Semantic Components
```tsx
// Good
<Button variant="primary" onClick={handleSubmit}>Submit</Button>

// Avoid
<button class="btn btn-primary" onClick={handleSubmit}>Submit</button>
```

### 2. Leverage Loading States
```tsx
// Good
<Button loading={submitting()}>Save</Button>

// Avoid
<Button disabled={submitting()}>
  {submitting() ? "Saving..." : "Save"}
</Button>
```

### 3. Use Toast for Notifications
```tsx
// Good
toast.success("Project created!");

// Avoid
setMessage("Project created!");
setTimeout(() => setMessage(""), 3000);
```

### 4. Add Tooltips to Icons
```tsx
// Good
<Tooltip content="Delete">
  <Button icon={<Icons.Trash />} />
</Tooltip>

// Avoid
<Button icon={<Icons.Trash />} />
```

### 5. Use Proper Variants
```tsx
// Good
<Button variant="danger" onClick={handleDelete}>Delete</Button>

// Avoid
<Button class="bg-error" onClick={handleDelete}>Delete</Button>
```

---

## Troubleshooting

### Modal Not Showing
Make sure the Modal is rendered and `open` prop is true:
```tsx
<Modal open={show()} onClose={() => setShow(false)}>
```

### Tooltip Not Appearing
Check that the tooltip has a trigger element:
```tsx
<Tooltip content="Help text">
  <button>Hover me</button>
</Tooltip>
```

### Toast Not Working
Ensure ToastContainer is added to your app root:
```tsx
<ToastContainer />
```

### Dropdown Not Positioning Correctly
The dropdown uses Portal rendering. Make sure your app has proper z-index management.

---

## Need Help?

- **Quick Reference**: See `COMPONENT_GUIDE.md`
- **Detailed Docs**: See `FRONTEND_ENHANCEMENTS.md`
- **Design System**: See `project_frontend.md`

---

**Happy migrating! 🚀**
