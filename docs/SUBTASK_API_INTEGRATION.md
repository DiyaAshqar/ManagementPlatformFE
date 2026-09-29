# SubTask API Integration Guide

This document explains how the SubTask API integration works in the project management platform.

## Overview

The SubTask API integration allows you to create, read, update, and delete subtasks associated with project stage tasks. The integration is built using NSwag-generated clients and Angular services.

## Architecture

### 1. API Client (Auto-generated)
Location: `src/nswag/api-client.ts`

The `SubTaskClient` provides the following endpoints:
- `createSubTask(body: CreateSubTaskCommand)` - Create or update a subtask
- `getSubTask(id: number)` - Get a subtask by ID
- `getAllSubTask(pageNumber, pageSize, filter)` - Get all subtasks with pagination
- `deleteSubTask(body: DeleteSubTaskCommand)` - Delete a subtask

### 2. SubTask Service
Location: `src/app/features/project-management/services/subtask.service.ts`

The `SubtaskService` wraps the API client and provides:
- Data transformation between API DTOs and UI form data
- Helper methods for mapping enums and date formats
- Simplified API calls with RxJS observables

#### Key Methods:
```typescript
// Create or update a subtask
createSubTask(command: CreateSubTaskCommand): Observable<boolean>

// Get a subtask by ID
getSubTask(id: number): Observable<ProjectSubTaskDto | undefined>

// Delete a subtask
deleteSubTask(id: number): Observable<boolean>

// Map form data to API command
mapToCreateCommand(formData: any, projectStageTaskId: number): CreateSubTaskCommand

// Map API DTO to form data
mapToFormData(dto: ProjectSubTaskDto): any
```

### 3. SubTask Dialog Component
Location: `src/app/features/project-management/components/shared-stage-board/dialog/subtask-dialog/`

The dialog component handles:
- Creating new subtasks
- Editing existing subtasks
- Form validation
- API integration with loading states
- Success/error notifications

## Data Models

### CreateSubTaskCommand (API)
```typescript
{
  id?: number;                        // Optional: for updates
  title?: string;                     // Subtask title
  startDate?: Date;                   // Start date
  endDate?: Date;                     // End date
  status?: ProjectStatusSubTask;      // Enum: 0 or 1
  type?: SubTaskType;                 // Enum: 0
  cost?: number;                      // Cost amount
  qty?: number;                       // Quantity
  projectStageTaskId?: number;        // Required: Parent task ID
}
```

### SubTaskFormData (UI)
```typescript
{
  id?: number;                        // Optional: for updates
  title: string;                      // Subtask title
  startDate: string;                  // Date in YYYY-MM-DD format
  endDate: string;                    // Date in YYYY-MM-DD format
  status: 'completed' | 'in-progress' | 'pending';
  type: string;                       // Type description
  cost: string;                       // Formatted as "$1,200"
  quantity: string;                   // Formatted as "150 m³"
}
```

### WorkItem (UI)
The WorkItem interface now includes:
```typescript
{
  // ... other fields
  taskId?: number;  // Backend task ID for API operations
  subtasks: SubTask[];
}
```

## Usage Examples

### 1. Opening the Add Subtask Dialog

```typescript
openAddSubtaskDialog(item: WorkItem): void {
  this.dialogRef = this.dialogService.open(SubtaskDialogComponent, {
    header: 'Add Subtask',
    width: '600px',
    modal: true,
    data: {
      mode: 'add',
      projectStageTaskId: item.taskId,  // IMPORTANT: Pass the backend task ID
      subtask: {
        title: '',
        startDate: '',
        endDate: '',
        status: 'pending',
        type: '',
        cost: '',
        quantity: ''
      }
    }
  });

  this.dialogRef.onClose.subscribe((result: any) => {
    if (result && result.success) {
      // Handle successful creation
      const data = result.data;
      // Update your local state with the new subtask
    }
  });
}
```

### 2. Opening the Edit Subtask Dialog

```typescript
openEditSubtaskDialog(item: WorkItem, subtask: SubTask): void {
  this.dialogRef = this.dialogService.open(SubtaskDialogComponent, {
    header: 'Edit Subtask',
    width: '600px',
    modal: true,
    data: {
      mode: 'edit',
      projectStageTaskId: item.taskId,  // IMPORTANT: Pass the backend task ID
      subtask: { ...subtask }
    }
  });

  this.dialogRef.onClose.subscribe((result: any) => {
    if (result && result.success) {
      // Handle successful update
      const data = result.data;
      // Update your local state with the edited subtask
    }
  });
}
```

### 3. Using the Service Directly

```typescript
import { SubtaskService } from '../services/subtask.service';
import { CreateSubTaskCommand } from '../../../nswag/api-client';

constructor(private subtaskService: SubtaskService) {}

createNewSubtask() {
  const command = new CreateSubTaskCommand({
    title: 'Excavation Work',
    startDate: new Date('2025-01-15'),
    endDate: new Date('2025-01-20'),
    status: ProjectStatusSubTask._0,
    cost: 5000,
    qty: 100,
    projectStageTaskId: 123
  });

  this.subtaskService.createSubTask(command).subscribe({
    next: (success) => {
      if (success) {
        console.log('Subtask created successfully');
      }
    },
    error: (error) => {
      console.error('Failed to create subtask:', error);
    }
  });
}
```

## Important Notes

### 1. ProjectStageTaskId Requirement
- **Always** pass `projectStageTaskId` when opening the subtask dialog
- This is required by the API for creating subtasks
- Store the backend task ID in the WorkItem's `taskId` field

### 2. Status Enum Mapping
The service handles status mapping:
- UI: `'pending'`, `'in-progress'`, `'completed'`
- API: `ProjectStatusSubTask._0` (in-progress), `ProjectStatusSubTask._1` (completed)

### 3. Date Format Conversion
- UI uses HTML date inputs: `YYYY-MM-DD` format
- API expects Date objects
- The service handles conversion automatically

### 4. Cost and Quantity Formatting
- UI displays formatted strings: `"$1,200"`, `"150 m³"`
- API expects numbers
- The service strips formatting before sending to API

### 5. Dialog Response Structure
```typescript
{
  success: boolean;  // Indicates if operation was successful
  data: SubTaskFormData;  // The subtask data (including ID if created)
}
```

## Error Handling

The dialog component uses PrimeNG's MessageService for notifications:
- **Success**: Green toast notification
- **Warning**: Yellow toast for validation errors
- **Error**: Red toast for API errors

Example error messages:
- "Title is required" - Validation error
- "Project stage task ID is missing" - Missing required data
- "Failed to save subtask" - API error

## Testing the Integration

### Prerequisites
1. Backend API running at the configured endpoint
2. Valid authentication token
3. Existing project with tasks (projectStageTaskId)

### Test Flow
1. Navigate to project page: `http://localhost:4200/projects/9`
2. Open a work item dialog
3. Click "Add Subtask"
4. Fill in the form:
   - Title: "Test Subtask"
   - Start Date: Select a date
   - Status: Select from dropdown
   - Cost: Enter numeric value
5. Click "Save"
6. Verify:
   - Success message appears
   - Subtask appears in the list
   - Backend receives the request

## Troubleshooting

### Issue: "Project stage task ID is missing"
**Solution**: Ensure `taskId` is set in the WorkItem when opening the dialog:
```typescript
data: {
  projectStageTaskId: item.taskId  // Make sure this is set
}
```

### Issue: API returns 400 Bad Request
**Possible causes**:
- Missing required fields (title, projectStageTaskId)
- Invalid enum values
- Invalid date format

**Solution**: Check the CreateSubTaskCommand structure and ensure all required fields are provided

### Issue: Subtask not appearing after creation
**Solution**: Ensure you're handling the dialog close event correctly and updating the UI state:
```typescript
this.dialogRef.onClose.subscribe((result: any) => {
  if (result && result.success) {
    // Update your local state here
  }
});
```

## Future Enhancements

1. **Batch Operations**: Support for creating multiple subtasks at once
2. **File Attachments**: Add support for attaching files to subtasks
3. **History Tracking**: Track changes and show subtask history
4. **Real-time Updates**: WebSocket integration for live updates
5. **Advanced Filters**: Filter subtasks by status, date range, etc.

## Related Files

- API Client: `src/nswag/api-client.ts`
- Service: `src/app/features/project-management/services/subtask.service.ts`
- Dialog Component: `src/app/features/project-management/components/shared-stage-board/dialog/subtask-dialog/`
- App Config: `src/app/app.config.ts` (SubTaskClient provider)
- Shared Component: `src/app/features/project-management/components/shared-stage-board/shared-stage-board.component.ts`
