import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, TransportRoute, errorText } from '../services/api.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="wrap narrow">
      <h1>Get a bus pass</h1>
      <p class="muted">Fill this in once. The transport office approves requests in the order they arrive.</p>

      @if (done()) {
        <div class="msg ok">
          <strong>Request sent.</strong> Keep your roll number handy and use
          <a routerLink="/status">Check request</a> to see when it's approved.
        </div>
      } @else {
        <form #f="ngForm" (ngSubmit)="submit()" class="form">
          <label>Full name <input name="name" [(ngModel)]="m.name" required></label>
          <label>Roll number <input name="rollNo" [(ngModel)]="m.rollNo" required></label>
          <div class="two">
            <label>Department <input name="department" [(ngModel)]="m.department" required></label>
            <label>Year
              <select name="year" [(ngModel)]="m.year" required>
                <option [ngValue]="null" disabled>Choose</option>
                @for (y of [1, 2, 3, 4]; track y) { <option [ngValue]="y">Year {{ y }}</option> }
              </select>
            </label>
          </div>
          <div class="two">
            <label>Phone (10 digits) <input name="phone" [(ngModel)]="m.phone" required pattern="[0-9]{10}" inputmode="numeric"></label>
            <label>Email <input name="email" type="email" [(ngModel)]="m.email" required></label>
          </div>
          <label>Route
            <select name="routeId" [(ngModel)]="m.routeId" (ngModelChange)="m.stop = ''" required>
              <option [ngValue]="null" disabled>Choose a route</option>
              @for (r of routes(); track r.id) {
                <option [ngValue]="r.id" [disabled]="r.seatsLeft === 0">{{ r.name }} ({{ r.seatsLeft }} seats left)</option>
              }
            </select>
          </label>
          <label>Your stop
            <select name="stop" [(ngModel)]="m.stop" required [disabled]="!m.routeId">
              <option value="" disabled>Choose a stop</option>
              @for (s of stops(); track s.name) { <option [value]="s.name">{{ s.name }} – {{ s.time }}</option> }
            </select>
          </label>
          @if (error()) { <p class="msg err">{{ error() }}</p> }
          <button class="btn" type="submit" [disabled]="f.invalid || busy()">Send request</button>
        </form>
      }
    </section>
  `,
})
export class RegisterComponent {
  private api = inject(ApiService);
  routes = signal<TransportRoute[]>([]);
  error = signal('');
  done = signal(false);
  busy = signal(false);
  m: any = { name: '', rollNo: '', department: '', year: null, phone: '', email: '', routeId: null, stop: '' };

  constructor() {
    const pre = Number(inject(ActivatedRoute).snapshot.queryParamMap.get('route'));
    this.api.routes().subscribe({
      next: (r) => {
        this.routes.set(r);
        if (pre && r.some((x) => x.id === pre)) this.m.routeId = pre;
      },
      error: (e) => this.error.set(errorText(e)),
    });
  }

  stops() {
    return this.routes().find((r) => r.id === this.m.routeId)?.stops ?? [];
  }

  submit() {
    this.busy.set(true);
    this.error.set('');
    this.api.register(this.m).subscribe({
      next: () => { this.done.set(true); this.busy.set(false); },
      error: (e) => { this.error.set(errorText(e)); this.busy.set(false); },
    });
  }
}
