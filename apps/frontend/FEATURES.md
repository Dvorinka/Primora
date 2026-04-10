# Primora Platform - Feature Guide

## 🎯 Dashboard

### Project Dashboard
When you select a project, you'll see:

**Statistics Cards**
- Storage buckets count
- API keys count  
- Team members count
- Audit log events count

**Usage Charts**
- Bandwidth usage over time
- Request count analytics

**Quick Actions**
- Create Bucket - Set up storage instantly
- Generate API Key - Authenticate your apps
- Invite Members - Add team collaborators

**Help Section**
- Documentation links
- Getting started guides

## 📁 Projects Page

### Features
- **Grid View**: Visual cards for all projects
- **Search**: Real-time filtering by name, slug, or description
- **Create Modal**: Streamlined project creation
  - Auto-generates slug from name
  - Optional description
  - Instant validation
- **Project Cards**: Show name, slug, role, and description
- **Quick Actions**: View dashboard or manage settings
- **Settings Panel**: Edit project details (admin only)

### User Flow
1. Click "New Project" button
2. Enter project name (slug auto-generates)
3. Add optional description
4. Click "Create Project"
5. Onboarding modal appears automatically
6. Navigate to project dashboard

## 👥 Members Page

### Organization Members Tab
- **Member List**: All organization members with avatars
- **Role Management**: Inline role updates (Owner, Admin, Member)
- **Search**: Filter members by name or email
- **Remove Members**: Quick removal (except yourself)

### Project Members Tab
- **Project-Specific**: Members with project access
- **Role Options**: Admin, Developer, Viewer
- **Granular Control**: Different roles per project

### Pending Invitations
- **Visual Indicators**: Yellow highlight for pending invites
- **Invitation Details**: Email, roles, and date
- **Revoke Option**: Cancel pending invitations

### Invite Modal
- **Email Input**: Send invitations via email
- **Organization Role**: Set org-level permissions
- **Project Attachment**: Optionally add to current project
- **Project Role**: Set project-level permissions

## 💾 Storage Page

### Three-Panel Layout

**Left Panel: Buckets**
- List of all buckets
- Search functionality
- Bucket stats (object count, size)
- Visibility badges (Public/Private)
- Click to select

**Center Panel: Objects**
- Table view of files
- File details (name, size, type, date)
- Quick actions (preview, download, delete)
- Pagination for large lists
- Empty state with upload prompt

**Right Panel: Settings**
- Bucket name and slug
- Visibility toggle
- Update button
- Delete bucket (with confirmation)

### Modals

**Create Bucket**
- Name input with auto-slug
- Visibility selection
- Instant creation

**Upload File**
- File selector
- File preview before upload
- Size and type display
- Progress indication

**Object Preview**
- Image preview for images
- Text preview for code/text files
- Download prompt for other types
- Truncation warning for large files

## ⚙️ Settings Page

### API Keys Tab
- **Key List**: All API keys with status
- **Create Key**: Generate new authentication keys
- **One-Time Secret**: Secure key display (copy immediately!)
- **Key Management**: Revoke keys when needed
- **Security Warning**: Prominent security best practices

### Organization Tab
- **Organization Details**: Name and slug
- **Update Settings**: Modify organization info
- **Danger Zone**: Delete organization (owner only)
- **Warning Messages**: Clear consequences of actions

### General Tab
- **Theme Selection**: Light, Dark, System
- **Language**: Multiple language support
- **Timezone**: Set your timezone
- **Notifications**: Email, security, product updates

## 📊 Audit Page

### Statistics Dashboard
- **Total Events**: All logged activities
- **Creates**: New resource count
- **Updates**: Modified resource count
- **Deletes**: Removed resource count

### Filters
- **Search**: Find by resource, actor, or details
- **Action Filter**: Filter by action type (create, update, delete, etc.)
- **Real-time**: Instant filtering

### Audit Log Table
- **Timestamp**: When the action occurred
- **Action**: What happened (with color-coded badges)
- **Resource**: What was affected
- **Actor**: Who performed the action (with avatar)
- **Details**: Expandable JSON metadata

### Export Options
- **CSV Export**: For spreadsheet analysis
- **JSON Export**: For programmatic processing
- **Compliance**: Meet audit requirements

## 🎓 Onboarding Modal

### Step 1: Welcome
- Overview of setup process
- Visual progress indicators
- Skip option available

### Step 2: API Keys
- Explanation of API keys
- Security tips
- Link to settings

### Step 3: Integration
- Code snippet for your language
- Copy-paste ready
- Documentation link

## 🎨 Design Features

### Visual Elements
- **Modern Cards**: Clean, elevated design
- **Color-Coded Badges**: Instant status recognition
- **Smooth Animations**: Fade-ins, slide-ins, scale effects
- **Hover States**: Interactive feedback
- **Loading States**: Skeleton screens and spinners

### User Experience
- **Empty States**: Helpful messages and actions
- **Error Messages**: Clear, actionable feedback
- **Confirmation Dialogs**: Prevent accidental deletions
- **Toast Notifications**: Non-intrusive updates
- **Keyboard Navigation**: Full keyboard support

### Responsive Design
- **Mobile-First**: Works on all screen sizes
- **Touch-Friendly**: Large tap targets
- **Adaptive Layouts**: Grid to stack on mobile
- **Collapsible Panels**: Save space on small screens

## 🔐 Security Features

### API Key Management
- One-time secret display
- Secure storage recommendations
- Revocation capability
- Activity tracking

### Access Control
- Role-based permissions
- Organization-level roles
- Project-level roles
- Owner-only actions

### Audit Trail
- Complete activity log
- Actor identification
- Resource tracking
- Metadata preservation

## 🚀 Performance

### Optimizations
- **Pagination**: Load data in chunks
- **Search Debouncing**: Reduce API calls
- **Lazy Loading**: Load modals on demand
- **Efficient Rendering**: SolidJS reactivity
- **Caching**: Reduce redundant requests

### User Feedback
- **Loading Indicators**: Know when things are processing
- **Progress Bars**: Track long operations
- **Skeleton Screens**: Show structure while loading
- **Error Recovery**: Retry failed operations

## 💡 Tips & Tricks

### Keyboard Shortcuts (Future)
- `Cmd/Ctrl + K`: Command palette
- `Cmd/Ctrl + N`: New project
- `Cmd/Ctrl + ,`: Settings
- `Esc`: Close modals

### Best Practices
1. **Projects**: Use descriptive names and slugs
2. **Members**: Assign minimal required permissions
3. **Storage**: Organize with clear bucket names
4. **API Keys**: Rotate keys regularly
5. **Audit**: Review logs periodically

### Common Workflows

**Setting Up a New Project**
1. Create project
2. Complete onboarding
3. Generate API key
4. Create storage bucket
5. Invite team members
6. Start building!

**Managing Team Access**
1. Invite via email
2. Set organization role
3. Attach to projects
4. Set project roles
5. Monitor via audit logs

**Organizing Storage**
1. Create buckets by purpose
2. Set appropriate visibility
3. Upload files
4. Use consistent naming
5. Monitor usage

## 🆘 Support

### Getting Help
- **Documentation**: Comprehensive guides
- **In-App Tips**: Contextual help messages
- **Error Messages**: Actionable solutions
- **Support Team**: Contact for assistance

### Feedback
- Report bugs
- Request features
- Share suggestions
- Rate your experience

---

**Version**: 2.0.0  
**Last Updated**: 2024  
**Platform**: Primora
