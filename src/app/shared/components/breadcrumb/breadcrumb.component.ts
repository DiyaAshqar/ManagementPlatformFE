import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, filter, takeUntil } from 'rxjs';
import { LanguageService } from '../../../core/services/language.service';

export interface BreadcrumbItem {
  label: string;
  url?: string;
  icon?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  items: BreadcrumbItem[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private translate: TranslateService,
    public languageService: LanguageService
  ) {
    // Watch for language changes using effect
    effect(() => {
      // This will run whenever currentLanguage signal changes
      this.languageService.currentLanguage();
      this.updateBreadcrumbs();
    });
  }

  ngOnInit(): void {
    this.updateBreadcrumbs();
    
    // Listen to route changes
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateBreadcrumbs();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateBreadcrumbs(): void {
    const url = this.router.url;
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always add Management as first breadcrumb
    breadcrumbs.push({
      label: this.translate.instant('breadcrumb.management'),
      url: '/'
    });

    // Parse the URL and create breadcrumbs
    if (url.includes('/agreement-wizard')) {
      breadcrumbs.push({
        label: this.translate.instant('breadcrumb.agreementWizard'),
        url: '/agreement-wizard'
      });

      if (url.includes('/create')) {
        breadcrumbs.push({
          label: this.translate.instant('breadcrumb.createAgreement')
        });
      } else if (url.includes('/edit/')) {
        breadcrumbs.push({
          label: this.translate.instant('breadcrumb.editAgreement')
        });
      } else if (url.includes('/view/')) {
        breadcrumbs.push({
          label: this.translate.instant('breadcrumb.viewAgreement')
        });
      }
    } else if (url.includes('/projects')) {
      breadcrumbs.push({
        label: this.translate.instant('breadcrumb.projects'),
        url: '/projects'
      });

      if (url.match(/\/projects\/\d+/)) {
        breadcrumbs.push({
          label: this.translate.instant('breadcrumb.projectDetails')
        });
      }
    } else if (url.includes('/constructor')) {
      breadcrumbs.push({
        label: this.translate.instant('breadcrumb.constructor'),
        url: '/constructor'
      });

      if (url.includes('/new')) {
        breadcrumbs.push({
          label: this.translate.instant('breadcrumb.newConstructor')
        });
      } else if (url.includes('/edit/')) {
        breadcrumbs.push({
          label: this.translate.instant('breadcrumb.editConstructor')
        });
      }
    } else if (url.includes('/supplier')) {
      breadcrumbs.push({
        label: this.translate.instant('breadcrumb.supplier'),
        url: '/supplier'
      });

      if (url.includes('/new')) {
        breadcrumbs.push({
          label: this.translate.instant('breadcrumb.newSupplier')
        });
      } else if (url.includes('/edit/')) {
        breadcrumbs.push({
          label: this.translate.instant('breadcrumb.editSupplier')
        });
      }
    } else if (url.includes('/dashboard') || url === '/') {
      breadcrumbs.push({
        label: this.translate.instant('breadcrumb.dashboard')
      });
    }

    this.items = breadcrumbs;
  }
}

