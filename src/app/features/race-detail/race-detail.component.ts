import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { JolpicaRaceDetail } from '../../core/models/f1.models';
import { F1Service } from '../../core/services/f1.service';

@Component({
  selector: 'app-race-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './race-detail.component.html',
})
export class RaceDetailComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly f1Service = inject(F1Service);

  protected readonly race = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('round') ?? '1'),
      switchMap((round) => this.f1Service.getRaceDetail(round)),
    ),
  );

  protected readonly selectedDriverId = computed(() => {
    const race = this.race();
    return race ? this.f1Service.selectedDriverForRound(race.round) : undefined;
  });

  protected vote(race: JolpicaRaceDetail, driverId: string): void {
    this.f1Service.voteDriver(race.round, driverId);
  }

  protected toggleFavorite(race: JolpicaRaceDetail): void {
    this.f1Service.toggleFavoriteCircuit(race);
  }
}
