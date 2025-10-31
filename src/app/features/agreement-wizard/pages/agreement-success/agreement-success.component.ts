import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-agreement-success',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TranslateModule
  ],
  templateUrl: './agreement-success.component.html',
  styleUrls: ['./agreement-success.component.scss']
})
export class AgreementSuccessComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    // Optional: Add animation or confetti effect
  }

  goToAgreementList(): void {
    this.router.navigate(['/agreement-wizard']);
  }

  createNewAgreement(): void {
    this.router.navigate(['/agreement-wizard/create']);
  }
}
