import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MultiSelectModule } from 'primeng/multiselect';

// Custom Components

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    TranslateModule,
    CardModule,
    ButtonModule,
    MultiSelectModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  // MultiSelect sample data
  selectedItems: any[] = [];
  items = [
    { name: 'Option 1', code: 'OPT1' },
    { name: 'Option 2', code: 'OPT2' },
    { name: 'Option 3', code: 'OPT3' },
    { name: 'Option 4', code: 'OPT4' },
    { name: 'Option 5', code: 'OPT5' }
  ];

  // Sample data for upcoming events
  upcomingEvents = [
    {
      id: 1,
      title: 'Team Meeting',
      date: 'Oct 25, 2025',
      time: '10:00 AM',
      icon: 'pi-users'
    },
    {
      id: 2,
      title: 'Project Deadline',
      date: 'Oct 28, 2025',
      time: '5:00 PM',
      icon: 'pi-calendar'
    },
    {
      id: 3,
      title: 'Client Presentation',
      date: 'Nov 02, 2025',
      time: '2:00 PM',
      icon: 'pi-briefcase'
    }
  ];

  // Sample data for recent transactions
  recentTransactions = [
    {
      id: 1,
      title: 'Salary Deposit',
      amount: '+$3,500',
      date: 'Oct 15, 2025',
      type: 'income',
      icon: 'pi-arrow-down-left'
    },
    {
      id: 2,
      title: 'Rent Payment',
      amount: '-$1,200',
      date: 'Oct 14, 2025',
      type: 'expense',
      icon: 'pi-arrow-up-right'
    },
    {
      id: 3,
      title: 'Groceries',
      amount: '-$150',
      date: 'Oct 13, 2025',
      type: 'expense',
      icon: 'pi-shopping-cart'
    },
    {
      id: 4,
      title: 'Freelance Income',
      amount: '+$850',
      date: 'Oct 12, 2025',
      type: 'income',
      icon: 'pi-money-bill'
    }
  ];
}
