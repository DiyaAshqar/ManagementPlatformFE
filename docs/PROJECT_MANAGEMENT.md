# Project Management Feature

## Overview
A comprehensive project management system built with Angular 19 and PrimeNG components, inspired by modern project tracking applications. This feature allows users to manage construction projects with stages, tasks, team members, and progress tracking.

## Features

### 📊 Project Dashboard
- **Statistics Overview**: Display total, active, and completed projects with budget tracking
- **Advanced Filtering**: Filter by status, priority, and search by name/client
- **Data Table**: Sortable, paginated table with project information
- **Quick Actions**: View, edit, and delete projects from the list

### 📝 Project Creation
- **Create Project Dialog**: Modal dialog with comprehensive form
- **Form Fields**:
  - Project Name
  - Description
  - Client Name
  - Project Manager
  - Start/End Dates
  - Budget (with currency formatting)
  - Priority (Low, Medium, High, Urgent)
- **Validation**: Real-time form validation with error messages
- **Internationalization**: English and Arabic support

### 🔍 Project Details
- **Project Information Cards**: Display key metrics (client, manager, budget, progress)
- **Kanban Board**: Visual representation of project stages
- **Stage Management**: 6 default stages (Preparing, Excavation, Foundation, Structure, Finishing, Milestone)
- **Task Tracking**: View tasks within each stage with status, progress, and assignee
- **Team View**: Display team members with roles and contact information
- **Timeline View**: Show project start and end dates

## Technology Stack

### Frontend Framework
- **Angular 19**: Latest Angular version with standalone components
- **Signals**: For reactive state management
- **Reactive Forms**: For form handling and validation

### UI Components (PrimeNG)
- **Table**: For project listing with sorting, filtering, and pagination
- **Card**: For information cards and containers
- **Dialog**: For create project modal
- **Button**: For actions and navigation
- **Tag**: For status and priority badges
- **ProgressBar**: For progress visualization
- **Tabs**: For project detail sections
- **Dropdown/MultiSelect**: For filters and form inputs
- **DatePicker**: For date selection
- **InputNumber**: For budget input with currency formatting
- **Skeleton**: For loading states

### Styling
- **PrimeFlex**: Utility-first CSS framework
- **SCSS**: For custom component styles
- **Responsive Design**: Mobile-first approach

## Project Structure

```
src/app/features/project-management/
├── models/
│   ├── project.model.ts      # TypeScript interfaces and enums
│   └── index.ts               # Export models
├── services/
│   └── project.service.ts    # Project data service with CRUD operations
├── pages/
│   ├── project-list/         # Main project dashboard
│   │   ├── project-list.component.ts
│   │   ├── project-list.component.html
│   │   └── project-list.component.scss
│   └── project-detail/       # Individual project view
│       ├── project-detail.component.ts
│       ├── project-detail.component.html
│       └── project-detail.component.scss
└── components/
    ├── create-project-dialog/
    │   ├── create-project-dialog.component.ts
    │   ├── create-project-dialog.component.html
    │   └── create-project-dialog.component.scss
    ├── file-upload-dialog/   # TODO: To be implemented
    └── print-report-dialog/  # TODO: To be implemented
```

## Data Models

### Project
```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: Date;
  endDate: Date;
  progress: number;
  budget: number;
  spent: number;
  clientName: string;
  projectManager: string;
  team: TeamMember[];
  stages: Stage[];
  documents: ProjectDocument[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Stage
```typescript
interface Stage {
  id: string;
  name: string;
  projectId: string;
  order: number;
  status: StageStatus;
  tasks: Task[];
  startDate?: Date;
  endDate?: Date;
  progress: number;
}
```

### Task
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  stageId: string;
  assignedTo: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  completedDate?: Date;
  progress: number;
  dependencies: string[];
  attachments: string[];
}
```

## Enums

- **ProjectStatus**: PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED
- **ProjectPriority**: LOW, MEDIUM, HIGH, URGENT
- **StageStatus**: PREPARING, EXCAVATION, FOUNDATION, STRUCTURE, FINISHING, MILESTONE, COMPLETED
- **TaskStatus**: TODO, IN_PROGRESS, REVIEW, BLOCKED, COMPLETED
- **TaskPriority**: LOW, MEDIUM, HIGH, URGENT

## Service Methods

### ProjectService

```typescript
// Get all projects with optional filters
getProjects(filters?: ProjectFilters): Observable<Project[]>

// Get project by ID
getProjectById(id: string): Observable<Project | undefined>

// Create new project
createProject(dto: CreateProjectDto): Observable<Project>

// Update existing project
updateProject(id: string, dto: UpdateProjectDto): Observable<Project>

// Delete project
deleteProject(id: string): Observable<void>

// Get project statistics
getProjectStats(): Observable<ProjectStats>

// Update task status
updateTaskStatus(projectId: string, stageId: string, taskId: string, status: TaskStatus): Observable<void>

// Add task to stage
addTask(projectId: string, stageId: string, task: Omit<Task, 'id'>): Observable<Task>
```

## Routes

```typescript
{
  path: 'projects',
  children: [
    {
      path: '',
      component: ProjectListComponent  // List all projects
    },
    {
      path: ':id',
      component: ProjectDetailComponent  // View project details
    }
  ]
}
```

## Translations

### English (en.json)
```json
{
  "projects": {
    "title": "Project Management",
    "subtitle": "Manage all construction projects and track progress",
    "createNew": "Create New Project",
    "status": {
      "planning": "Planning",
      "in_progress": "In Progress",
      "on_hold": "On Hold",
      "completed": "Completed",
      "cancelled": "Cancelled"
    },
    // ... more translations
  }
}
```

### Arabic (ar.json)
```json
{
  "projects": {
    "title": "إدارة المشاريع",
    "subtitle": "إدارة جميع مشاريع البناء وتتبع التقدم",
    "createNew": "إنشاء مشروع جديد",
    "status": {
      "planning": "التخطيط",
      "in_progress": "قيد التنفيذ",
      // ... more translations
    }
  }
}
```

## Usage

### Navigate to Projects
```typescript
// In sidebar or anywhere
this.router.navigate(['/projects']);
```

### Create New Project
1. Click "Create New Project" button
2. Fill in the form with required information
3. Click "Save" to create the project
4. The project will appear in the list

### View Project Details
1. Click the eye icon on any project in the list
2. View stages, tasks, team members, and timeline
3. Switch between tabs to see different information

### Filter Projects
1. Use the search box to search by name/client
2. Select statuses from the status filter
3. Select priorities from the priority filter
4. Click "Clear Filters" to reset

## Mock Data

The service includes mock data for 3 sample projects:
1. Downtown Commercial Complex (High priority, 45% complete)
2. Residential Tower Project (Medium priority, 25% complete)
3. Highway Extension Project (Urgent priority, 10% complete)

Each project has:
- Mock stages with tasks
- Team members
- Budget and spending information
- Timeline information

## Future Enhancements

### File Upload Dialog
- Upload project documents
- Categorize by type (Drawing, Specification, Contract, Report, Image)
- File size limits and validation
- Document preview and download

### Print Report Dialog
- Select report sections to include
- PDF generation
- Custom report templates
- Export to Excel/CSV

### Additional Features
- **Gantt Chart**: Visual timeline of all stages and tasks
- **Resource Management**: Assign equipment and materials
- **Budget Tracking**: Detailed expense tracking
- **Notifications**: Real-time updates on project changes
- **Comments**: Discussion threads on projects/tasks
- **Attachments**: File management system
- **Analytics**: Project performance metrics
- **Calendar View**: Deadline and milestone calendar
- **Mobile App**: Native mobile application

## API Integration

To integrate with a backend API, update the `ProjectService`:

```typescript
// Replace mock data with API calls
getProjects(filters?: ProjectFilters): Observable<Project[]> {
  return this.http.get<ApiResponse<Project[]>>('/api/projects', {
    params: this.buildParams(filters)
  }).pipe(
    map(response => response.data)
  );
}

createProject(dto: CreateProjectDto): Observable<Project> {
  return this.http.post<ApiResponse<Project>>('/api/projects', dto).pipe(
    map(response => response.data)
  );
}

// Add similar updates for other methods
```

## Styling Guidelines

### Color Coding
- **Success**: Green - Completed status
- **Info**: Blue - In Progress status
- **Warning**: Orange/Yellow - On Hold status, High priority
- **Danger**: Red - Cancelled status, Urgent priority, Blocked tasks
- **Secondary**: Gray - Planning status

### Responsive Breakpoints
- **Mobile**: < 640px (1 column)
- **Tablet**: 640px - 960px (2 columns)
- **Desktop**: > 960px (3-4 columns)

## Testing

### Manual Testing Checklist
- [ ] Projects list loads with mock data
- [ ] Statistics cards display correct counts
- [ ] Search filter works
- [ ] Status and priority filters work
- [ ] Clear filters button resets all filters
- [ ] Create project dialog opens and closes
- [ ] Form validation works correctly
- [ ] New project is added to the list
- [ ] View project navigates to detail page
- [ ] Project details display correctly
- [ ] Stages show with tasks
- [ ] Team members are visible
- [ ] Timeline information is correct
- [ ] Navigation back to list works
- [ ] Responsive layout works on mobile

## Notes

- All PrimeNG components are properly imported
- Components use Angular 19 signals for reactivity
- Standalone components architecture
- Lazy loading for better performance
- RTL support for Arabic language
- Follows project's existing patterns and conventions

## Related Documentation

- [PrimeNG Documentation](https://primeng.org/)
- [Angular Documentation](https://angular.dev/)
- [PrimeFlex Documentation](https://primeflex.org/)
- Agreement Wizard implementation (similar patterns)
