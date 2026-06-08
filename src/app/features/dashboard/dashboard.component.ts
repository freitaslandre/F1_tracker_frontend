import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { F1Service } from '../../core/services/f1.service';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly f1Service = inject(F1Service);

  protected readonly races = toSignal(this.f1Service.getCurrentSeasonRaces(), { initialValue: [] });
}
