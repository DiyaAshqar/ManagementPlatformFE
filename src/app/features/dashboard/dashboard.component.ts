import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule, CardModule],
  template: `
    <div class="dashboard">
      <h1>{{ 'app.welcome' | translate }}</h1>
      <p>Dashboard is working!</p>
      
      <div class="grid mt-4">
        <div class="col-12 md:col-6 lg:col-3">
          <p-card header="Total Projects" styleClass="text-center">
            <h2>24</h2>
          </p-card>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
          <p-card header="Active Tasks" styleClass="text-center">
            <h2>156</h2>
          </p-card>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
          <p-card header="Team Members" styleClass="text-center">
            <h2>42</h2>
          </p-card>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
          <p-card header="Completed" styleClass="text-center">
            <h2>89%</h2>
          </p-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 2rem;
    }

    h1 {
      color: var(--text-color);
      margin-bottom: 1rem;
    }

    h2 {
      color: var(--primary-color);
      font-size: 2rem;
      margin: 0;
    }
  `]
})
export class DashboardComponent {}
