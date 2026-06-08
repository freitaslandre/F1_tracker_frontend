import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './auth-page.component.html',
})
export class AuthPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly mode = signal<'login' | 'register'>('login');
  protected name = '';
  protected email = 'demo@f1manager.test';
  protected password = 'password';

  protected switchMode(mode: 'login' | 'register'): void {
    this.mode.set(mode);
  }

  protected submit(): void {
    if (this.mode() === 'register') {
      this.auth.register(this.name || 'F1 Fan', this.email, this.password);
    } else {
      this.auth.login(this.email, this.password);
    }

    void this.router.navigateByUrl('/dashboard');
  }
}
