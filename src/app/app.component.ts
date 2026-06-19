import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { F1Service } from './core/services/f1.service';

@Component({
    selector: 'app-root',
    imports: [RouterLink, RouterLinkActive, RouterOutlet],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {
  protected readonly auth = inject(AuthService);
  private readonly f1Service = inject(F1Service);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.f1Service.refreshProfile().subscribe();
      }
    });
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth');
  }
}
