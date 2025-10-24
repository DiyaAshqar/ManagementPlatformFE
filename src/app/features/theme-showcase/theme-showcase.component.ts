import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { BadgeModule } from 'primeng/badge';

@Component({
  selector: 'app-theme-showcase',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    MessageModule,
    ChipModule,
    TagModule,
    DividerModule,
    BadgeModule
  ],
  templateUrl: './theme-showcase.component.html',
  styleUrls: ['./theme-showcase.component.scss']
})
export class ThemeShowcaseComponent {
  colors = [
    { name: 'Primary', var: '--primary-color', class: 'primary' },
    { name: 'Primary Hover', var: '--primary-color-hover', class: 'primary-hover' },
    { name: 'Secondary', var: '--secondary-color', class: 'secondary' },
    { name: 'Accent', var: '--accent-color', class: 'accent' },
    { name: 'Success', var: '--success-color', class: 'success' },
    { name: 'Warning', var: '--warning-color', class: 'warning' },
    { name: 'Danger', var: '--danger-color', class: 'danger' },
    { name: 'Info', var: '--info-color', class: 'info' }
  ];

  surfaces = [
    { name: 'Surface Ground', var: '--surface-ground' },
    { name: 'Surface Card', var: '--surface-card' },
    { name: 'Surface Border', var: '--surface-border' },
    { name: 'Background', var: '--background-color' }
  ];

  textColors = [
    { name: 'Text Primary', var: '--text-color' },
    { name: 'Text Secondary', var: '--text-secondary' },
    { name: 'Text Muted', var: '--text-muted' }
  ];
}
