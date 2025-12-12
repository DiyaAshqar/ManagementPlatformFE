# Task API Integration - Request/Response Examples

## Complete Flow Example

### Step 1: User Adds a Task

When a user clicks the "+" button in the board and fills the form:

```
Form Input:
├── Title: "Foundation Excavation - Phase 1"
├── Description: "Excavate foundation area with precision"
├── Priority: "High" (2)
├── Estimated Hours: 8
├── Start Date: 12/20/2024
├── Due Date: 12/25/2024
├── Assign To: "Mike Johnson"
├── Task Type: "Task" (1)
├── Location: "Grid A1-A5"
├── Depth: 3.5 m
├── Volume: 450 m³
├── Soil Type: "Clay"
└── Equipment: "Excavator CAT 320"
```

### Step 2: API Request Generated

The system converts the form data to match your API's expected format:

```http
POST /api/Task HTTP/1.1
Host: http://localhost:5000
Content-Type: application/json
Authorization: Bearer {token}

{
  "title": "Foundation Excavation - Phase 1",
  "description": "Excavate foundation area with precision",
  "assignTo": 1,
  "startDate": "2024-12-20T00:00:00.000Z",
  "endDate": "2024-12-25T00:00:00.000Z",
  "priority": 2,
  "taskPoint": 8,
  "excavationLocation": "Grid A1-A5",
  "excavationDepth": 3.5,
  "excavationVolume": 450,
  "excavationSoilType": "Clay",
  "excavationEquipment": "Excavator CAT 320",
  "status": 0,
  "projectStageId": 2,
  "taskTypeId": 1
}
```

### Step 3: API Response

Your backend should return:

```json
{
  "succeeded": true,
  "message": "Task created successfully",
  "data": true
}
```

### Step 4: Success Handler

The frontend receives the response and:

1. Shows success toast: ✅ "Task created successfully"
2. Refreshes the task list via: `GET /api/Task?ProjectStageId=2&PageNumber=1&PageSize=100`
3. New task appears in the board under the "To Do" column

---

## Error Scenarios

### Missing Required Fields

If the user forgets to enter the title:

```
Response Toast: ❌ "Error: Please enter a task title"
(Dialog stays open, user can fix and resubmit)
```

### API Error Response

If the backend returns an error:

```json
{
  "succeeded": false,
  "message": "Invalid project stage ID",
  "data": null
}
```

Response Handler:
```
Toast: ❌ "Error: Failed to create task via API"
Console: Error logged with full response
```

---

## Field Mapping Reference

### Form Field → API Field

| Form Field | API Field | Type | Required |
|-----------|-----------|------|----------|
| Title | `title` | string | ✅ Yes |
| Description | `description` | string | ❌ No |
| Priority | `priority` | number (0-2) | ❌ No |
| Estimated Hours | `taskPoint` | number | ❌ No |
| Start Date | `startDate` | ISO DateTime | ❌ No |
| Due Date | `endDate` | ISO DateTime | ❌ No |
| Assign To | `assignTo` | number (User ID) | ❌ No |
| Task Type | `taskTypeId` | number | ❌ No |
| Location | `excavationLocation` | string | ❌ No |
| Depth | `excavationDepth` | number (meters) | ❌ No |
| Volume | `excavationVolume` | number (m³) | ❌ No |
| Soil Type | `excavationSoilType` | string | ❌ No |
| Equipment | `excavationEquipment` | string | ❌ No |
| (Auto) Status | `status` | number (0=TODO) | ✅ Auto |
| (Auto) Stage | `projectStageId` | number | ✅ Auto |

---

## Priority Enum Mapping

```typescript
Priority Dropdown → API Value:
├── "Low" → 0
├── "Medium" → 1
├── "High" → 2
└── "Critical" → 3
```

---

## Task Status Enum Mapping

```typescript
Status (Auto-set to TODO) → API Value:
├── "TODO" → 0
├── "IN_PROGRESS" → 1
├── "REVIEW" → 2
└── "COMPLETED" → 3
```

---

## Real-World Example Flow

```
Timeline:
14:32:15 - User navigates to /projects/9
14:32:20 - User clicks "+" in "To Do" column
14:32:21 - Dialog opens with empty form
14:32:45 - User fills all fields
14:32:47 - User clicks "Add" button
14:32:48 - POST /api/Task sent with task data
14:32:50 - Backend processes request
14:32:51 - Backend returns success response
14:32:52 - Frontend shows ✅ "Task created successfully"
14:32:53 - GET /api/Task called to refresh list
14:32:55 - New task appears in board
14:32:56 - User sees "Foundation Excavation - Phase 1" in To Do column
```

---

## Testing with curl

```bash
# Create a task via API directly
curl -X POST http://localhost:5000/api/Task \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Task",
    "description": "Testing API integration",
    "priority": 1,
    "taskPoint": 5,
    "projectStageId": 2,
    "taskTypeId": 1
  }'
```

Expected response:
```json
{
  "succeeded": true,
  "message": "Task created successfully",
  "data": true
}
```

---

## Integration Points in Code

### 1. **TaskService** calls the API client
```typescript
createTask(taskCommand: CreateTaskCommand): Observable<BooleanResponse> {
  return this.taskClient.createTask(taskCommand);
}
```

### 2. **ProjectService** orchestrates the flow
```typescript
addTask(projectId, stageId, task, projectStageId, taskTypeId) {
  const command = new CreateTaskCommand({...});
  return this.taskService.createTask(command).pipe(
    switchMap((response) => {
      if (response.succeeded) {
        // Update local state and reload
      }
    })
  );
}
```

### 3. **ExcavationStageComponent** handles user actions
```typescript
onWorkItemAdded(event) {
  // Convert form data to task
  // Call projectService.addTask()
  // Show notification
  // Reload tasks
}
```

---

## Debugging Tips

If the API call doesn't work:

1. **Check Network Tab**: Open DevTools → Network tab
   - Filter by "Task"
   - Look for POST /api/Task request
   - Check request headers and body
   - Check response status (200 = success, 4xx = client error, 5xx = server error)

2. **Check Console**: DevTools → Console
   - Look for error messages logged by the component
   - Check for TypeScript type errors

3. **Check Backend Logs**
   - Verify the API received the request
   - Check for validation errors
   - Verify projectStageId is valid

4. **Verify API Response Format**
   - Response must have `succeeded` boolean
   - Response should have `data` property
   - Check for 200 HTTP status code
