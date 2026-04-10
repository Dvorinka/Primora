# Primora Platform - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Go 1.21+
- Node.js 18+
- PostgreSQL 14+
- Docker (optional)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/your-org/primora.git
cd primora
```

#### 2. Backend Setup
```bash
cd apps/backend

# Install dependencies
go mod download

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
go run cmd/migrate/main.go up

# Start the server
go run cmd/server/main.go
```

The backend will be available at `http://localhost:8080`

#### 3. Frontend Setup
```bash
cd apps/frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API URL

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

---

## 🎯 Key Features

### For Users

**Dashboard**
- Project overview with statistics
- Quick actions for common tasks
- Usage charts and analytics

**Projects**
- Create and manage projects
- Search and filter
- Role-based access control

**Members**
- Invite team members
- Manage roles and permissions
- Track pending invitations

**Storage**
- Create buckets
- Upload and manage files
- Preview images and text files

**Settings**
- Generate API keys
- Configure organization
- Manage preferences

**Audit Logs**
- Track all activities
- Filter and search logs
- Export for compliance

### For Developers

**Command Palette** (Ctrl/Cmd + K)
- Quick navigation
- Search commands
- Keyboard shortcuts

**Notifications**
- Success/error feedback
- Action prompts
- Auto-dismiss

**Data Export**
- JSON export
- CSV export
- Clipboard copy

**Advanced Search**
- Fuzzy matching
- Multi-field search
- Relevance sorting

---

## 🔧 Configuration

### Backend Configuration

**Environment Variables:**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/primora

# Server
PORT=8080
HOST=0.0.0.0

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=1m

# Storage
STORAGE_PATH=./storage
MAX_UPLOAD_SIZE=10485760

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

**Rate Limiting:**
```go
// Global rate limit: 100 requests per minute
rateLimiter := middleware.NewRateLimiter(100, time.Minute)
e.Use(rateLimiter.Middleware())

// Per-user rate limit: 1000 requests per hour
keyLimiter := middleware.NewKeyRateLimiter(1000, time.Hour)
e.Use(keyLimiter.Middleware(func(c echo.Context) string {
    return c.Get("user_id").(string)
}))
```

### Frontend Configuration

**Environment Variables:**
```env
# API
VITE_API_BASE_URL=http://localhost:8080/api/v1

# Features
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true

# Limits
VITE_MAX_FILE_SIZE=10485760
VITE_PAGE_SIZE=25
```

---

## 📝 Usage Examples

### Using the Command Palette

```tsx
// Define commands
const commands = [
  {
    id: "new-project",
    label: "Create New Project",
    description: "Start a new project",
    category: "Projects",
    keywords: ["add", "create", "new"],
    action: () => navigate("/projects/new")
  },
  {
    id: "settings",
    label: "Open Settings",
    category: "General",
    action: () => navigate("/settings")
  }
];

// Add to your app
<CommandPaletteEnhanced
  commands={commands}
  isOpen={showPalette()}
  onClose={() => setShowPalette(false)}
/>

// Trigger with keyboard shortcut
useKeyboardShortcuts([
  {
    key: "k",
    ctrl: true,
    meta: true,
    action: () => setShowPalette(true)
  }
]);
```

### Using Notifications

```tsx
import { notify } from "./components/NotificationCenter";

// Success notification
notify.success("Project Created", "Your project is ready");

// Error notification
notify.error("Upload Failed", "Please try again");

// With action
notify.warning("Unsaved Changes", "You have unsaved changes", {
  action: {
    label: "Save Now",
    onClick: () => saveChanges()
  }
});
```

### Exporting Data

```tsx
import { exportJSON, exportCSV } from "./utils/export";

// Export as JSON
const handleExportJSON = () => {
  exportJSON(auditLogs, "audit-logs");
};

// Export as CSV
const handleExportCSV = () => {
  exportCSV(projects, "projects", ["name", "slug", "created_at"]);
};
```

### Using the Data Table

```tsx
<DataTable
  data={projects}
  keyField="id"
  columns={[
    {
      key: "name",
      label: "Project Name",
      sortable: true,
      filterable: true
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      key: "status",
      label: "Status",
      render: (status) => <Badge>{status}</Badge>
    }
  ]}
  searchable
  exportable
  onExport={(data) => exportCSV(data, "projects")}
  onRowClick={(project) => navigate(`/projects/${project.id}`)}
  pageSize={25}
/>
```

---

## 🎨 Customization

### Theming

The platform uses Tailwind CSS for styling. Customize the theme in `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          // ... your colors
        }
      }
    }
  }
}
```

### Adding Custom Commands

```tsx
const customCommands = [
  {
    id: "custom-action",
    label: "My Custom Action",
    description: "Does something cool",
    category: "Custom",
    icon: <MyIcon />,
    action: () => {
      // Your custom logic
    }
  }
];
```

### Custom Validation Rules

```go
// Backend
validator := validation.New()
validator.Custom("field", "Custom error message")

// Or create a reusable validator
func ValidateProjectName(name string) error {
    if strings.Contains(name, "forbidden") {
        return errors.New("name contains forbidden word")
    }
    return nil
}
```

---

## 🧪 Testing

### Backend Tests

```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run specific package
go test ./internal/middleware
```

### Frontend Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

---

## 🐛 Debugging

### Backend Debugging

**Enable Debug Logging:**
```env
LOG_LEVEL=debug
```

**View Logs:**
```bash
# Follow logs
tail -f logs/app.log

# Search logs
grep "ERROR" logs/app.log
```

### Frontend Debugging

**Enable Debug Mode:**
```env
VITE_ENABLE_DEBUG=true
```

**Browser DevTools:**
- Open DevTools (F12)
- Check Console for errors
- Use Network tab for API calls
- Use React DevTools for component inspection

---

## 📦 Deployment

### Docker Deployment

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Checklist

- [ ] Set strong JWT secret
- [ ] Configure rate limiting
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Configure monitoring
- [ ] Set up error tracking
- [ ] Enable CORS properly
- [ ] Optimize database indexes
- [ ] Set up CDN for static assets
- [ ] Configure log rotation

---

## 🔍 Troubleshooting

### Common Issues

**Backend won't start:**
- Check database connection
- Verify environment variables
- Check port availability
- Review logs for errors

**Frontend won't connect:**
- Verify API URL in .env
- Check CORS configuration
- Verify backend is running
- Check browser console

**Rate limit errors:**
- Increase rate limits in config
- Check if IP is correct
- Verify rate limit middleware

**Upload failures:**
- Check file size limits
- Verify storage path exists
- Check file permissions
- Review storage configuration

---

## 📚 Additional Resources

### Documentation
- [API Documentation](./docs/api.md)
- [Component Guide](./apps/frontend/COMPONENT_GUIDE.md)
- [Architecture Overview](./docs/architecture.md)

### Community
- GitHub Issues
- Discord Server
- Stack Overflow Tag

### Learning
- [Video Tutorials](https://youtube.com/primora)
- [Blog Posts](https://blog.primora.dev)
- [Example Projects](https://github.com/primora/examples)

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

### Code Style

**Backend (Go):**
- Follow Go conventions
- Use `gofmt` for formatting
- Write meaningful comments
- Add tests for new features

**Frontend (TypeScript):**
- Follow TypeScript best practices
- Use Prettier for formatting
- Write JSDoc comments
- Add tests for components

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

---

## 🎉 You're Ready!

You now have everything you need to start building with Primora. Happy coding! 🚀

For questions or support, reach out to:
- Email: support@primora.dev
- Discord: discord.gg/primora
- Twitter: @primoradev
