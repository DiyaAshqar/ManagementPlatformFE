import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';

interface SubRecord {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'completed' | 'in-progress' | 'pending';
  type: string;
  cost: string;
  quantity: string;
}

interface ExcavationRecord {
  id: string;
  date: string;
  location: string;
  depth: string;
  volume: string;
  soilType: string;
  equipment: string;
  operator: string;
  status: 'completed' | 'in-progress' | 'pending';
  subRecords?: SubRecord[];
}

@Component({
  selector: 'app-excavation-stage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    TableModule,
    DialogModule,
    InputTextModule,
    DropdownModule,
    TooltipModule
  ],
  templateUrl: './excavation-stage.component.html',
  styleUrls: ['./excavation-stage.component.scss']
})
export class ExcavationStageComponent {
  @Input() projectId!: string;

  records = signal<ExcavationRecord[]>([
    {
      id: 'exc-1',
      date: '2024-02-05',
      location: 'Grid A1-A5',
      depth: '3.5m',
      volume: '450 m³',
      soilType: 'Clay',
      equipment: 'Excavator CAT 320',
      operator: 'Mike Johnson',
      status: 'completed',
      subRecords: [
        {
          id: 'sub-1-1',
          title: 'Topsoil Removal',
          startDate: '2024-02-05',
          endDate: '2024-02-05',
          status: 'completed',
          type: 'Excavation',
          cost: '$1,200',
          quantity: '150 m³'
        },
        {
          id: 'sub-1-2',
          title: 'Clay Extraction',
          startDate: '2024-02-05',
          endDate: '2024-02-05',
          status: 'completed',
          type: 'Excavation',
          cost: '$2,400',
          quantity: '300 m³'
        }
      ]
    },
    {
      id: 'exc-2',
      date: '2024-02-06',
      location: 'Grid B1-B5',
      depth: '4.2m',
      volume: '520 m³',
      soilType: 'Sandy Clay',
      equipment: 'Excavator CAT 320',
      operator: 'Mike Johnson',
      status: 'completed',
      subRecords: [
        {
          id: 'sub-2-1',
          title: 'Site Clearing',
          startDate: '2024-02-06',
          endDate: '2024-02-06',
          status: 'completed',
          type: 'Preparation',
          cost: '$800',
          quantity: '520 m³'
        }
      ]
    },
    {
      id: 'exc-3',
      date: '2024-02-07',
      location: 'Grid C1-C5',
      depth: '3.8m',
      volume: '480 m³',
      soilType: 'Clay',
      equipment: 'Excavator Volvo EC380',
      operator: 'David Smith',
      status: 'in-progress',
      subRecords: []
    },
    {
      id: 'exc-4',
      date: '2024-02-08',
      location: 'Grid D1-D5',
      depth: '4.0m',
      volume: '500 m³',
      soilType: 'Rock',
      equipment: 'Excavator Volvo EC380',
      operator: 'David Smith',
      status: 'pending',
      subRecords: []
    }
  ]);

  expandedRecords = signal<Set<string>>(new Set());
  editingId = signal<string | null>(null);
  showAddDialog = signal(false);
  showAddSubRecordDialog = signal(false);
  selectedRecordId = signal<string | null>(null);

  newRecord: Omit<ExcavationRecord, 'id'> = {
    date: '',
    location: '',
    depth: '',
    volume: '',
    soilType: '',
    equipment: '',
    operator: '',
    status: 'pending'
  };

  newSubRecord: Omit<SubRecord, 'id'> = {
    title: '',
    startDate: '',
    endDate: '',
    status: 'pending',
    type: '',
    cost: '',
    quantity: ''
  };

  editingRecord: Partial<ExcavationRecord> = {};

  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in-progress' },
    { label: 'Completed', value: 'completed' }
  ];

  get completedCount(): number {
    return this.records().filter(r => r.status === 'completed').length;
  }

  get inProgressCount(): number {
    return this.records().filter(r => r.status === 'in-progress').length;
  }

  get totalVolume(): number {
    return this.records()
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + parseFloat(r.volume.replace(/[^\d.]/g, '') || '0'), 0);
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast'> = {
      'completed': 'success',
      'in-progress': 'info',
      'pending': 'warning'
    };
    return severityMap[status] || 'secondary';
  }

  getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      'completed': 'Completed',
      'in-progress': 'In Progress',
      'pending': 'Pending'
    };
    return labelMap[status] || status;
  }

  toggleExpanded(recordId: string): void {
    const expanded = new Set(this.expandedRecords());
    if (expanded.has(recordId)) {
      expanded.delete(recordId);
    } else {
      expanded.add(recordId);
    }
    this.expandedRecords.set(expanded);
  }

  isExpanded(recordId: string): boolean {
    return this.expandedRecords().has(recordId);
  }

  openAddDialog(): void {
    this.newRecord = {
      date: '',
      location: '',
      depth: '',
      volume: '',
      soilType: '',
      equipment: '',
      operator: '',
      status: 'pending'
    };
    this.showAddDialog.set(true);
  }

  addRecord(): void {
    if (!this.newRecord.date || !this.newRecord.location) return;

    const record: ExcavationRecord = {
      id: `exc-${Date.now()}`,
      ...this.newRecord,
      subRecords: []
    };

    this.records.update(records => [...records, record]);
    this.showAddDialog.set(false);
  }

  startEdit(record: ExcavationRecord): void {
    this.editingId.set(record.id);
    this.editingRecord = { ...record };
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editingRecord = {};
  }

  saveEdit(): void {
    const id = this.editingId();
    if (!id) return;

    this.records.update(records => 
      records.map(r => r.id === id ? { ...r, ...this.editingRecord } : r)
    );
    this.editingId.set(null);
    this.editingRecord = {};
  }

  deleteRecord(id: string): void {
    this.records.update(records => records.filter(r => r.id !== id));
  }

  openAddSubRecord(recordId: string): void {
    this.selectedRecordId.set(recordId);
    this.newSubRecord = {
      title: '',
      startDate: '',
      endDate: '',
      status: 'pending',
      type: '',
      cost: '',
      quantity: ''
    };
    this.showAddSubRecordDialog.set(true);
  }

  addSubRecord(): void {
    const recordId = this.selectedRecordId();
    if (!recordId || !this.newSubRecord.title) return;

    const subRecord: SubRecord = {
      id: `sub-${Date.now()}`,
      ...this.newSubRecord
    };

    this.records.update(records =>
      records.map(r =>
        r.id === recordId
          ? { ...r, subRecords: [...(r.subRecords || []), subRecord] }
          : r
      )
    );

    // Expand the record to show the new sub-record
    const expanded = new Set(this.expandedRecords());
    expanded.add(recordId);
    this.expandedRecords.set(expanded);

    this.showAddSubRecordDialog.set(false);
    this.selectedRecordId.set(null);
  }

  deleteSubRecord(recordId: string, subRecordId: string): void {
    this.records.update(records =>
      records.map(r =>
        r.id === recordId
          ? { ...r, subRecords: r.subRecords?.filter(sr => sr.id !== subRecordId) }
          : r
      )
    );
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
