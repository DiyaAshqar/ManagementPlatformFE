// ─────────────────────────────────────────────────────────────────────────────
// Temporary mock data — remove this file once the API is stable
// ─────────────────────────────────────────────────────────────────────────────

import { BehaviorSubject, Observable } from 'rxjs';
import { Project, ProjectPriority, ProjectStatus, StageStatus } from '../models';

export const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Al-Manara Residential Tower',
    description: 'Construction of a 20-floor residential tower in the city center',
    status: ProjectStatus.IN_PROGRESS,
    priority: ProjectPriority.HIGH,
    startDate: new Date('2025-01-15'),
    endDate: new Date('2026-12-31'),
    progress: 42,
    budget: 5000000,
    spent: 2100000,
    clientName: 'Al-Ufuq Real Estate Group',
    projectManager: 'Ahmed Al-Zahrani',
    team: [
      { id: 't1', name: 'Ahmed Al-Zahrani', role: 'Project Manager', email: 'ahmed@example.com' },
      { id: 't2', name: 'Sara Al-Harbi',    role: 'Civil Engineer',  email: 'sara@example.com'  }
    ],
    stages: [
      { id: 's1', name: 'Preparation', projectId: '1', order: 1, status: StageStatus.COMPLETED,  tasks: [], progress: 100 },
      { id: 's2', name: 'Excavation',  projectId: '1', order: 2, status: StageStatus.COMPLETED,  tasks: [], progress: 100 },
      { id: 's3', name: 'Foundation',  projectId: '1', order: 3, status: StageStatus.FOUNDATION, tasks: [], progress: 60  },
      { id: 's4', name: 'Structure',   projectId: '1', order: 4, status: StageStatus.STRUCTURE,  tasks: [], progress: 0   }
    ],
    documents: [],
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date('2026-02-20')
  },
  {
    id: '2',
    name: 'Al-Waha Commercial Complex',
    description: 'Development of an integrated commercial complex with shops, offices, and restaurants',
    status: ProjectStatus.PLANNING,
    priority: ProjectPriority.MEDIUM,
    startDate: new Date('2025-04-01'),
    endDate: new Date('2027-03-31'),
    progress: 10,
    budget: 8500000,
    spent: 850000,
    clientName: 'Al-Waha Investment Co.',
    projectManager: 'Khalid Al-Mutairi',
    team: [
      { id: 't3', name: 'Khalid Al-Mutairi', role: 'Project Manager', email: 'khalid@example.com' }
    ],
    stages: [
      { id: 's5', name: 'Preparation', projectId: '2', order: 1, status: StageStatus.PREPARING, tasks: [], progress: 10 }
    ],
    documents: [],
    createdAt: new Date('2025-03-20'),
    updatedAt: new Date('2026-01-15')
  },
  {
    id: '3',
    name: 'Gulf Luxury Villa',
    description: 'Construction of a luxury seafront villa with outdoor pool and garden',
    status: ProjectStatus.COMPLETED,
    priority: ProjectPriority.LOW,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-06-30'),
    progress: 100,
    budget: 1200000,
    spent: 1150000,
    clientName: 'Mr. Fahad Al-Otaibi',
    projectManager: 'Mona Al-Shammari',
    team: [
      { id: 't4', name: 'Mona Al-Shammari', role: 'Architect', email: 'mona@example.com' }
    ],
    stages: [
      { id: 's6', name: 'Preparation', projectId: '3', order: 1, status: StageStatus.COMPLETED, tasks: [], progress: 100 },
      { id: 's7', name: 'Foundation',  projectId: '3', order: 2, status: StageStatus.COMPLETED, tasks: [], progress: 100 },
      { id: 's8', name: 'Finishing',   projectId: '3', order: 3, status: StageStatus.COMPLETED, tasks: [], progress: 100 }
    ],
    documents: [],
    createdAt: new Date('2023-12-15'),
    updatedAt: new Date('2025-07-01')
  },
  {
    id: '4',
    name: 'Al-Nour Medical Hospital',
    description: 'Construction of a full-service hospital with a 200-bed capacity across all medical departments',
    status: ProjectStatus.IN_PROGRESS,
    priority: ProjectPriority.URGENT,
    startDate: new Date('2024-06-01'),
    endDate: new Date('2027-05-31'),
    progress: 28,
    budget: 15000000,
    spent: 4200000,
    clientName: 'Ministry of Health',
    projectManager: 'Omar Al-Dosari',
    team: [
      { id: 't5', name: 'Omar Al-Dosari',   role: 'Project Manager',      email: 'omar@example.com'   },
      { id: 't6', name: 'Reem Al-Qahtani',  role: 'Electrical Engineer',  email: 'reem@example.com'   },
      { id: 't7', name: 'Yousef Al-Subaie', role: 'Mechanical Engineer',  email: 'yousef@example.com' }
    ],
    stages: [
      { id: 's9',  name: 'Preparation', projectId: '4', order: 1, status: StageStatus.COMPLETED,  tasks: [], progress: 100 },
      { id: 's10', name: 'Excavation',  projectId: '4', order: 2, status: StageStatus.EXCAVATION, tasks: [], progress: 70  },
      { id: 's11', name: 'Foundation',  projectId: '4', order: 3, status: StageStatus.FOUNDATION, tasks: [], progress: 15  }
    ],
    documents: [],
    createdAt: new Date('2024-05-20'),
    updatedAt: new Date('2026-02-22')
  },
  {
    id: '5',
    name: 'City Public Park',
    description: 'Development of a 50,000 sqm public park featuring playgrounds and walking trails',
    status: ProjectStatus.ON_HOLD,
    priority: ProjectPriority.MEDIUM,
    startDate: new Date('2025-09-01'),
    endDate: new Date('2026-08-31'),
    progress: 5,
    budget: 3000000,
    spent: 150000,
    clientName: 'City Municipality',
    projectManager: 'Noura Al-Rashid',
    team: [
      { id: 't8', name: 'Noura Al-Rashid', role: 'Landscape Architect', email: 'noura@example.com' }
    ],
    stages: [
      { id: 's12', name: 'Preparation', projectId: '5', order: 1, status: StageStatus.PREPARING, tasks: [], progress: 5 }
    ],
    documents: [],
    createdAt: new Date('2025-08-10'),
    updatedAt: new Date('2025-11-30')
  }
];

// BehaviorSubject so consumers can get the current snapshot or subscribe to changes
const _mockProjects$ = new BehaviorSubject<Project[]>(MOCK_PROJECTS);

/** Observable stream of all mock projects */
export const mockProjects$: Observable<Project[]> = _mockProjects$.asObservable();
