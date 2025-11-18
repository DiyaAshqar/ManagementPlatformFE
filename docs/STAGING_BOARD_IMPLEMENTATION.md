# Staging Board - Kanban Implementation

## Overview
The Staging Board is an Azure Boards-style Kanban board component designed for managing project work items with support for main tasks and subtasks. It provides a visual, drag-and-drop interface for tracking work progress through different stages.

## Features

### 1. **Kanban Board Layout**
- 5 columns: Backlog, To Do, In Progress, Review, Done
- Drag-and-drop work items between columns
- WIP (Work In Progress) limits with visual warnings
- Real-time column item counts

### 2. **Work Item Types**
- **User Story**: Feature requests from user perspective
- **Bug**: Defects or issues to fix
- **Task**: General work items
- **Epic**: Large feature sets
- **Feature**: New functionality

### 3. **Work Item Properties**
- Title and description
- Priority levels (Low, Medium, High, Critical)
- Assignee with avatar
- Story points for estimation
- Tags for categorization
- Due dates
- Created dates
- Custom status tracking

### 4. **Subtasks Management**
- Add unlimited subtasks to any work item
- Track subtask completion status
- Assign subtasks to team members
- Visual progress indicator
- Quick toggle completion state

### 5. **Dashboard Statistics**
- Total items count
- In progress items
- Completed items
- Overall completion percentage

## Component Structure

```
staging-board/
├── staging-board.component.ts      # Component logic
├── staging-board.component.html    # Template
└── staging-board.component.scss    # Styles
```

## Usage

Add the component to your project detail page:

```html
<app-staging-board [projectId]="project()!.id"></app-staging-board>
```

## Key Interactions

### Adding Work Items
1. Click the "+" button in any column header
2. Fill in the work item details
3. Click "Add Item"

### Managing Subtasks
1. Click on a work item card
2. Scroll to the Subtasks section
3. Enter subtask title and optional assignee
4. Click "Add" or press Enter

### Moving Work Items
- Drag any work item card to another column
- WIP limits will prevent adding items to full columns

### Completing Subtasks
- Click the checkbox icon next to any subtask
- Progress bar updates automatically

## Dependencies

- **@angular/cdk**: Drag-and-drop functionality
- **PrimeNG Components**:
  - Card, Button, Tag, Dialog
  - InputText, Select, Textarea
  - Avatar, Chip, ProgressBar
  - Tooltip

## Customization

### Adding Custom Work Item Types
Edit the `WorkItemType` enum in the component:

```typescript
enum WorkItemType {
  USER_STORY = 'User Story',
  BUG = 'Bug',
  TASK = 'Task',
  YOUR_TYPE = 'Your Type'
}
```

### Adjusting WIP Limits
Modify the `wipLimit` property for each column:

```typescript
{
  id: TaskStatus.IN_PROGRESS,
  title: 'In Progress',
  items: [],
  wipLimit: 3  // Change this number
}
```

### Styling
The component uses CSS variables for theming. Override these in your styles:

```scss
.work-item-card {
  border-color: var(--primary-color);
}
```

## Sample Data

The component includes sample work items demonstrating various scenarios:
- Work items with and without subtasks
- Different priorities and types
- Various assignees
- Completed and in-progress items

## Best Practices

1. **Keep WIP Low**: Use WIP limits to prevent team overload
2. **Break Down Large Items**: Add subtasks to complex work items
3. **Update Regularly**: Move items as work progresses
4. **Use Story Points**: Estimate work for better planning
5. **Tag Appropriately**: Use tags for easy filtering and searching

## Future Enhancements

- Filtering by assignee, priority, or tags
- Search functionality
- Sprint planning features
- Time tracking
- Comments and activity history
- File attachments
- Custom fields
- Export/import capabilities
- Team velocity metrics
