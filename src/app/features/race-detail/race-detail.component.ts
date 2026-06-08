import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { JolpicaRaceDetail } from '../../core/models/f1.models';
import { F1Service } from '../../core/services/f1.service';

@Component({
  standalone: true,
  selector: 'app-race-detail',
  imports: [RouterLink],
  templateUrl: './race-detail.component.html',
})
export class RaceDetailComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly f1Service = inject(F1Service);

  protected readonly race = toSignal<JolpicaRaceDetail | undefined>(
    this.route.paramMap.pipe(
      map((params) => ({
        season: Number(params.get('season') ?? String(new Date().getUTCFullYear())),
        round: params.get('round') ?? '1',
      })),
      switchMap(({ season, round }) => this.f1Service.getRaceDetail(season, round)),
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
