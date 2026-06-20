import { Component, computed, inject } from '@angular/core';
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
  protected readonly favoriteLocations = computed(() => {
    const countries = [...new Set(this.f1Service.favorites().map((favorite) => favorite.country))];
    return countries.length ? countries.slice(0, 3).join(', ') : 'Sem países guardados';
  });
  protected readonly fantasySummary = computed(() => {
    const team = this.f1Service.fantasyTeam();
    if (!team) {
      return 'Sem equipa criada';
    }

    return `${team.drivers.length} pilotos · ${team.constructors.length} construtores`;
  });
  protected readonly mostVotedDriver = computed(() => {
    const voteCounts = this.f1Service.voteList().reduce<Record<string, number>>((acc, vote) => {
      acc[vote.driverName] = (acc[vote.driverName] ?? 0) + 1;
      return acc;
    }, {});
    const [driverName] = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0] ?? [];
    return driverName ?? 'Sem votos';
  });

  constructor() {
    this.f1Service.refreshProfile().subscribe();
  }
}
