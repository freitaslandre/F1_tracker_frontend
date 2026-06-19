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
  protected readonly error = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);

  protected switchMode(mode: 'login' | 'register'): void {
    this.mode.set(mode);
  }

  protected submit(): void {
    this.error.set(null);
    this.isSubmitting.set(true);

    const request =
      this.mode() === 'register'
        ? this.auth.register(this.name || 'F1 Fan', this.email, this.password)
        : this.auth.login(this.email, this.password);

    request.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.error.set(err?.error?.message ?? 'Não foi possível autenticar.');
      },
    });
  }
}
