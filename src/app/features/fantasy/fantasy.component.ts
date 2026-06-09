import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';
import { F1Service } from '../../core/services/f1.service';
import { FantasyConstructor, FantasyDriver } from '../../core/models/f1.models';

@Component({
  standalone: true,
  selector: 'app-fantasy',
  imports: [CommonModule],
  templateUrl: './fantasy.component.html',
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
        color: #f8fafc;
        font-family: Inter, system-ui, sans-serif;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 24px;
      }

      .header h1 {
        margin: 0;
        font-size: 2rem;
      }

      .eyebrow {
        margin: 0 0 8px;
        color: #94a3b8;
        font-size: 0.95rem;
      }

      .status-pill {
        padding: 10px 16px;
        border-radius: 999px;
        background: rgba(59, 130, 246, 0.16);
        color: #bfdbfe;
        font-weight: 700;
      }

      .layout {
        display: grid;
        grid-template-columns: minmax(280px, 1fr) minmax(360px, 1.4fr);
        gap: 24px;
      }

      .panel {
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(148, 163, 184, 0.1);
        border-radius: 24px;
        padding: 22px;
      }

      .panel h2 {
        margin: 0 0 16px;
        font-size: 1.2rem;
      }

      .budget-overview {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 18px;
      }

      .budget-card {
        padding: 16px;
        border-radius: 18px;
        background: rgba(30, 41, 59, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.08);
      }

      .budget-card strong {
        display: block;
        margin-bottom: 6px;
        color: #cbd5e1;
        font-size: 0.85rem;
      }

      .budget-card span {
        font-size: 1.25rem;
        font-weight: 800;
        color: #fff;
      }

      .slots {
        display: grid;
        gap: 14px;
      }

      .slot {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        border-radius: 16px;
        background: rgba(15, 23, 42, 0.85);
        border: 1px dashed rgba(148, 163, 184, 0.18);
      }

      .slot.occupied {
        border-style: solid;
      }

      .slot-icon {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        background: linear-gradient(140deg, #0f172a, #1e3a8a);
        display: grid;
        place-items: center;
        color: #e2e8f0;
        font-weight: 800;
        font-size: 1rem;
      }

      .slot-body {
        flex: 1;
        min-width: 0;
      }

      .slot-body h3,
      .slot-body p {
        margin: 0;
      }

      .slot-body p {
        margin-top: 6px;
        color: #94a3b8;
        font-size: 0.92rem;
      }

      .slot-meta {
        display: grid;
        gap: 6px;
        text-align: right;
      }

      .slot-meta span {
        display: block;
        color: #e2e8f0;
        font-weight: 700;
      }

      .slot-meta small {
        color: #94a3b8;
        font-size: 0.8rem;
      }

      .slot button {
        border: 0;
        background: transparent;
        color: #fef2f2;
        font-size: 1.1rem;
        cursor: pointer;
      }

      .tab-list {
        display: flex;
        gap: 12px;
        margin-bottom: 18px;
      }

      .tab {
        padding: 10px 18px;
        border-radius: 999px;
        cursor: pointer;
        border: 1px solid transparent;
        color: #cbd5e1;
      }

      .tab.active {
        background: #0f172a;
        border-color: rgba(59, 130, 246, 0.36);
        color: #fff;
      }

      .search-bar {
        width: 100%;
        margin-bottom: 18px;
      }

      .search-bar input {
        width: 100%;
        padding: 14px 16px;
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        background: #0f172a;
        color: #fff;
      }

      .selection-list {
        display: grid;
        gap: 12px;
      }

      .selection-item {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 14px;
        align-items: center;
        padding: 16px;
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(148, 163, 184, 0.1);
      }

      .selection-avatar {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        background: #1e293b;
        display: grid;
        place-items: center;
        color: #f8fafc;
        font-size: 1rem;
        font-weight: 800;
      }

      .selection-info {
        min-width: 0;
      }

      .selection-info h3 {
        margin: 0;
        font-size: 1rem;
      }

      .selection-info p {
        margin: 6px 0 0;
        color: #94a3b8;
        font-size: 0.88rem;
      }

      .selection-actions {
        display: grid;
        gap: 8px;
        justify-items: end;
      }

      .selection-actions span {
        color: #cbd5e1;
        font-weight: 700;
      }

      .selection-actions button {
        min-width: 100px;
        border: 0;
        border-radius: 999px;
        padding: 10px 16px;
        cursor: pointer;
        background: #2563eb;
        color: #fff;
        font-weight: 700;
        transition: background 180ms ease;
      }

      .selection-actions button:disabled {
        background: rgba(148, 163, 184, 0.24);
        cursor: not-allowed;
      }

      .footer {
        margin-top: 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .footer strong {
        display: block;
        font-size: 0.98rem;
        margin-top: 8px;
      }

      .continue-button {
        border: 0;
        border-radius: 999px;
        padding: 14px 26px;
        background: #2563eb;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }

      .continue-button:disabled {
        background: rgba(148, 163, 184, 0.24);
        cursor: not-allowed;
      }
    `,
  ],
})
export class FantasyComponent {
  private readonly service = inject(F1Service);

  readonly activeTab = signal<'drivers' | 'constructors'>('drivers');
  readonly searchTerm = signal('');
  readonly isLoading = signal(true);
  readonly error = signal<string | undefined>(undefined);

  readonly drivers = signal<FantasyDriver[]>([]);
  readonly constructors = signal<FantasyConstructor[]>([]);
  readonly selectedDrivers = signal<(FantasyDriver | null)[]>(Array.from({ length: 5 }, () => null));
  readonly selectedConstructors = signal<(FantasyConstructor | null)[]>(Array.from({ length: 2 }, () => null));

  readonly selectedDriverCount = computed(() => this.selectedDrivers().filter(Boolean).length);
  readonly selectedConstructorCount = computed(() => this.selectedConstructors().filter(Boolean).length);
  readonly usedBudget = computed(() => {
    const driverTotal = this.selectedDrivers()
      .filter((item): item is FantasyDriver => item !== null)
      .reduce((sum, item) => sum + item.price, 0);

    const constructorTotal = this.selectedConstructors()
      .filter((item): item is FantasyConstructor => item !== null)
      .reduce((sum, item) => sum + item.price, 0);

    return Number((driverTotal + constructorTotal).toFixed(1));
  });
  readonly remainingBudget = computed(() => Math.max(0, 100 - this.usedBudget()));
  readonly isTeamValid = computed(
    () => this.selectedDriverCount() === 5 && this.selectedConstructorCount() === 2 && this.usedBudget() <= 100,
  );

  readonly filteredDrivers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.drivers().filter((driver) =>
      !term ||
      driver.name.toLowerCase().includes(term) ||
      driver.team.toLowerCase().includes(term) ||
      driver.initials.toLowerCase().includes(term),
    );
  });

  readonly filteredConstructors = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.constructors().filter((constructor) =>
      !term ||
      constructor.name.toLowerCase().includes(term) ||
      constructor.nationality.toLowerCase().includes(term) ||
      constructor.initials.toLowerCase().includes(term),
    );
  });

  constructor() {
    this.loadFantasyData();
  }

  selectTab(value: 'drivers' | 'constructors'): void {
    this.activeTab.set(value);
    this.searchTerm.set('');
  }

  addDriver(driver: FantasyDriver): void {
    if (!this.canAddDriver(driver)) {
      return;
    }

    this.selectedDrivers.update((current) => {
      const next = [...current];
      const firstEmpty = next.findIndex((item) => item === null);
      if (firstEmpty === -1) {
        return current;
      }

      next[firstEmpty] = driver;
      return next;
    });
  }

  removeDriver(index: number): void {
    this.selectedDrivers.update((current) => {
      const next = [...current];
      next[index] = null;
      return next;
    });
  }

  addConstructor(constructor: FantasyConstructor): void {
    if (!this.canAddConstructor(constructor)) {
      return;
    }

    this.selectedConstructors.update((current) => {
      const next = [...current];
      const firstEmpty = next.findIndex((item) => item === null);
      if (firstEmpty === -1) {
        return current;
      }

      next[firstEmpty] = constructor;
      return next;
    });
  }

  removeConstructor(index: number): void {
    this.selectedConstructors.update((current) => {
      const next = [...current];
      next[index] = null;
      return next;
    });
  }

  canAddDriver(driver: FantasyDriver): boolean {
    return (
      this.selectedDriverCount() < 5 &&
      !this.selectedDrivers().some((item) => item?.id === driver.id) &&
      this.usedBudget() + driver.price <= 100
    );
  }

  canAddConstructor(constructor: FantasyConstructor): boolean {
    return (
      this.selectedConstructorCount() < 2 &&
      !this.selectedConstructors().some((item) => item?.id === constructor.id) &&
      this.usedBudget() + constructor.price <= 100
    );
  }

  formatPrice(value: number): string {
    return `$${value.toFixed(1)}M`;
  }

  private loadFantasyData(): void {
    this.isLoading.set(true);
    this.error.set(undefined);

    forkJoin({
      drivers: this.service.getFantasyDriversData(),
      constructors: this.service.getFantasyConstructorsData(),
    })
      .pipe(take(1))
      .subscribe({
        next: ({ drivers, constructors }) => {
          this.drivers.set(drivers);
          this.constructors.set(constructors);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Não foi possível carregar os dados de fantasy.');
          this.isLoading.set(false);
        },
      });
  }
}
