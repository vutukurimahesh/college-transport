import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, TransportRoute } from '../services/api.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="hero">
      <h1>Which bus passes your stop?</h1>
      <p>Type the stop nearest to you. We'll show every route that picks up there.</p>
      <input class="search" type="search" placeholder="e.g. City Centre" aria-label="Search by stop"
             [value]="q()" (input)="q.set($any($event.target).value)">
    </section>

    <section class="wrap">
      @if (error()) { <p class="msg err">{{ error() }}</p> }
      @for (r of filtered(); track r.id) {
        <article class="route">
          <div class="route-head">
            <div>
              <h2>{{ r.name }}</h2>
              <p class="muted">Bus {{ r.busNumber }} · ₹{{ r.fare }} per year</p>
            </div>
            <div class="seats" [class.low]="r.seatsLeft < 6">
              <strong>{{ r.seatsLeft }}</strong> seats left
            </div>
          </div>
          <ol class="line">
            @for (s of r.stops; track s.name) {
              <li [class.match]="q() && s.name.toLowerCase().includes(q().toLowerCase())">
                <time>{{ s.time }}</time><span>{{ s.name }}</span>
              </li>
            }
          </ol>
          <a class="btn" routerLink="/register" [queryParams]="{ route: r.id }">Get a pass on this route</a>
        </article>
      } @empty {
        @if (!error()) { <p class="empty">No route stops at "{{ q() }}". Try a nearby stop name.</p> }
      }
    </section>
  `,
})
export class HomeComponent {
  private api = inject(ApiService);
  routes = signal<TransportRoute[]>([]);
  q = signal('');
  error = signal('');
  filtered = computed(() => {
    const term = this.q().trim().toLowerCase();
    return term ? this.routes().filter((r) => r.stops.some((s) => s.name.toLowerCase().includes(term))) : this.routes();
  });

  constructor() {
    this.api.routes().subscribe({
      next: (r) => this.routes.set(r),
      error: () => this.error.set('Could not load routes. Start the backend (npm start in /backend) and refresh.'),
    });
  }
}
