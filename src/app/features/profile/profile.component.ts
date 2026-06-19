import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { F1Service } from '../../core/services/f1.service';

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  protected readonly auth = inject(AuthService);
  protected readonly f1Service = inject(F1Service);

  constructor() {
    this.f1Service.refreshProfile().subscribe();
  }
}
