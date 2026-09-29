# Add Task API Integration - Implementation Guide

## Overview
This implementation adds full API integration for creating new tasks in the project management system. When users click the "Add Task" button on the Excavation Stage (or any other stage using the shared-stage-board component), the task is now sent to the backend API at `POST /api/Task` with the `CreateTaskCommand` structure.

## Changes Made

### 1. **TaskService** (`src/app/features/project-management/services/task.service.ts`)
- Added `createTask(taskCommand: CreateTaskCommand): Observable<BooleanResponse>` method
- This method calls the TaskClient (auto-generated from Swagger) to create a task via the API

### 2. **ProjectService** (`src/app/features/project-management/services/project.service.ts`)
- Updated imports to include `CreateTaskCommand` and `StatusTask` from the API client
- Added `TaskService` injection
- Updated `addTask()` method to:
  - Convert frontend Task model to backend `CreateTaskCommand`
  - Call `TaskService.createTask()` to send data to the API
  - Return Observable that completes when the task is created
  - Include mapping helpers for priority and status enums

- Added helper methods:
  - `mapTaskPriorityToNumber()`: Convert TaskPriority enum to API priority number
  - `mapTaskStatusToStatusTask()`: Convert TaskStatus to API StatusTask enum

### 3. **Task Model** (`src/app/features/project-management/models/project.model.ts`)
- Extended Task interface with excavation-specific fields:
  - `estimatedHours?: number`
  - `startDate?: Date`
  - `location?: string`
  - `depth?: number`
  - `volume?: number`
  - `soilType?: string`
  - `equipment?: string`
  - Added `name` as an alias for `title` for compatibility

### 4. **Add Task Dialog Component** (NEW)
Created `src/app/features/project-management/components/add-task-dialog/`

**Components:**
- `add-task-dialog.component.ts`: Dialog controller with form handling
- `add-task-dialog.component.html`: User-friendly form with all task fields
- `add-task-dialog.component.scss`: Styling for the dialog

**Features:**
- Task title, description, priority, and estimated hours
- Date pickers for start and end dates
- Assign-to field for user assignment
- Excavation-specific details section (optional):
  - Location (Grid reference)
  - Depth (meters)
  - Volume (cubic meters)
  - Soil Type dropdown
  - Equipment field
- Form validation
- Success/error notifications via MessageService
- Returns task data and project stage ID to parent component

### 5. **SharedStageBoardComponent** (`src/app/features/project-management/components/shared-stage-board/`)
- Added `@Output() workItemAdded` event that emits when a new work item is added
- Added `@Output() workItemUpdated` event for updates
- Updated `saveWorkItem()` method to emit these events
- The "Add" button in each column now triggers the dialog that eventually sends data to the API

### 6. **ExcavationStageComponent** (`src/app/features/project-management/components/excavation-stage/`)
- Added imports for: `Task`, `TaskPriority` from models
- Added `MessageService` and `ToastModule` for user notifications
- Injected `ProjectService` for API calls
- Added `onWorkItemAdded()` method that:
  - Receives event from shared-stage-board when user adds a task
  - Converts form data to Task model
  - Calls `ProjectService.addTask()` to make API call
  - Shows success/error toast notification
  - Reloads task list to reflect new task from API
- Added `mapFormPriorityToTaskPriority()` helper for priority conversion
- Updated template to listen to `workItemAdded` event
- Added `<p-toast>` for notifications

## API Integration Flow

```
User clicks "+" button in Excavation Stage column
                    ↓
SharedStageBoardComponent.openAddDialog()
                    ↓
WorkItemDialogComponent opens (existing component)
                    ↓
User fills form and clicks "Add"
                    ↓
SharedStageBoardComponent.saveWorkItem()
                    ↓
workItemAdded event emitted
                    ↓
ExcavationStageComponent.onWorkItemAdded()
                    ↓
Data converted from form to Task model
                    ↓
ProjectService.addTask() called
                    ↓
CreateTaskCommand created with API-expected structure
                    ↓
TaskService.createTask() sends POST /api/Task
                    ↓
Backend creates task
                    ↓
TaskService reloads task list (getTasksByStageId)
                    ↓
Task appears in UI
```

## API Endpoint Details

**Endpoint:** `POST /api/Task`

**Request Body (CreateTaskCommand):**
```typescript
{
  id?: number;
  title: string;
  description: string;
  assignTo?: number;
  startDate?: Date;
  endDate?: Date;
  priority?: number; // 0=Low, 1=Medium, 2=High
  taskPoint?: number; // Estimated hours
  excavationLocation?: string;
  excavationDepth?: number;
  excavationVolume?: number;
  excavationSoilType?: string;
  excavationEquipment?: string;
  status?: StatusTask; // 0=To Do, 1=In Progress, 2=Review, 3=Completed
  projectStageId: number; // REQUIRED
  taskTypeId?: number;
}
```

**Response:**
```typescript
{
  succeeded: boolean;
  message?: string;
  data?: boolean;
}
```

## How to Use

### Creating a Task via API

1. Navigate to `/projects/9` (or any project page)
2. Go to the "Excavation Stage" tab
3. Click the "+" button in any of the columns (To Do, In Progress, Review, Done)
4. The WorkItemDialog opens with form fields
5. Fill in the task details:
   - **Title** (required)
   - **Description** (optional)
   - **Priority** (Low/Medium/High/Critical)
   - **Estimated Hours** (optional)
   - **Start Date** (optional)
   - **Due Date** (optional)
   - **Assign To** (optional - User ID or name)
   - **Task Type** (Task/Bug/Feature)
   - **Excavation Details** (Optional section):
     - Location (e.g., Grid A1-A5)
     - Depth in meters
     - Volume in cubic meters
     - Soil Type
     - Equipment
6. Click "Add" button
7. The task is sent to the API and created in the backend
8. On success, a green toast notification appears
9. The task list reloads and shows the new task

## Error Handling

- If the API returns an error, a red toast notification displays: "Failed to create task via API"
- The error is logged to the console
- The UI gracefully handles failures without crashing
- Users can retry by clicking the add button again

## Mapping Reference

### Priority Mapping
| Frontend | API Value |
|----------|-----------|
| Low      | 0         |
| Medium   | 1         |
| High     | 2         |
| Critical | 3         |

### Task Status Mapping
| Frontend | API Value |
|----------|-----------|
| TODO     | 0         |
| IN_PROGRESS | 1      |
| REVIEW   | 2         |
| COMPLETED | 3        |

## Files Modified

1. `src/app/features/project-management/services/task.service.ts`
2. `src/app/features/project-management/services/project.service.ts`
3. `src/app/features/project-management/models/project.model.ts`
4. `src/app/features/project-management/components/shared-stage-board/shared-stage-board.component.ts`
5. `src/app/features/project-management/components/excavation-stage/excavation-stage.component.ts`
6. `src/app/features/project-management/components/excavation-stage/excavation-stage.component.html`

## New Files Created

1. `src/app/features/project-management/components/add-task-dialog/add-task-dialog.component.ts`
2. `src/app/features/project-management/components/add-task-dialog/add-task-dialog.component.html`
3. `src/app/features/project-management/components/add-task-dialog/add-task-dialog.component.scss`

## Testing Checklist

- [ ] Navigate to `/projects/9`
- [ ] Click the "+" button in the Excavation Stage board
- [ ] Fill in task details
- [ ] Submit the form
- [ ] Verify success toast appears
- [ ] Verify new task appears in the board
- [ ] Check browser console for no errors
- [ ] Test with invalid data (empty title) - should show error
- [ ] Test with excavation details filled
- [ ] Verify API call is made with correct payload
- [ ] Test priority/status mapping

## Notes

- The WorkItemDialogComponent (existing) is used for the form UI instead of creating a new dialog
- The excavation-stage component now has real API integration
- Other stage components (Preparing, Milestone, Documents) can similarly integrate by following the same pattern
- The AddTaskDialogComponent is created but not currently used - it's available as an alternative if needed for a dedicated add-task modal
