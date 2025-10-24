import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';

export interface Account {
  id: string;
  title: string;
  description?: string;
  balance: string;
  type: 'savings' | 'checking' | 'investment' | 'debt';
}

@Component({
  selector: 'app-accounts-list',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    CardModule,
    ButtonModule,
    AvatarModule
  ],
  templateUrl: './accounts-list.component.html',
  styleUrls: ['./accounts-list.component.scss']
})
export class AccountsListComponent {
  @Input() totalBalance = '$26,540.25';
  
  @Input() accounts: Account[] = [
    {
      id: '1',
      title: 'Main Savings',
      description: 'Personal savings',
      balance: '$8,459.45',
      type: 'savings'
    },
    {
      id: '2',
      title: 'Checking Account',
      description: 'Daily expenses',
      balance: '$2,850.00',
      type: 'checking'
    },
    {
      id: '3',
      title: 'Investment Portfolio',
      description: 'Stock & ETFs',
      balance: '$15,230.80',
      type: 'investment'
    },
    {
      id: '4',
      title: 'Credit Card',
      description: 'Pending charges',
      balance: '$1,200.00',
      type: 'debt'
    },
    {
      id: '5',
      title: 'Savings Account',
      description: 'Emergency fund',
      balance: '$3,000.00',
      type: 'savings'
    }
  ];

  getAccountIcon(type: string): string {
    const icons: Record<string, string> = {
      savings: 'pi-wallet',
      checking: 'pi-qrcode',
      investment: 'pi-chart-line',
      debt: 'pi-credit-card'
    };
    return icons[type] || 'pi-wallet';
  }

  getAccountIconClass(type: string): string {
    const classes: Record<string, string> = {
      savings: 'icon-savings',
      checking: 'icon-checking',
      investment: 'icon-investment',
      debt: 'icon-debt'
    };
    return classes[type] || 'icon-savings';
  }

  onAddAccount(): void {
    console.log('Add account');
  }

  onSendMoney(): void {
    console.log('Send money');
  }

  onTopUp(): void {
    console.log('Top up');
  }

  onMore(): void {
    console.log('More options');
  }

  onAccountClick(account: Account): void {
    console.log('Account clicked:', account);
  }
}
