import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, MyRequest, errorText } from '../services/api.service';

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  template: `
    <section class="wrap narrow">
      <h1>Check your request</h1>
      <form class="inline" (ngSubmit)="search()">
        <input name="roll" [(ngModel)]="roll" placeholder="Roll number" required aria-label="Roll number">
        <button class="btn" type="submit" [disabled]="!roll.trim()">Check</button>
      </form>
      @if (error()) { <p class="msg err">{{ error() }}</p> }
      @if (searched()) {
        @for (r of results(); track r.id) {
          <div class="card">
            <div>
              <strong>{{ r.name }}</strong>
              <p class="muted">{{ r.route }} · {{ r.stop }} · sent {{ r.createdAt | date: 'd MMM y' }}</p>
            </div>
            <span class="pill {{ r.status }}">{{ r.status }}</span>
          </div>
        } @empty {
          <p class="empty">No request found for that roll number. Check the spelling or <a routerLink="/register">send a new request</a>.</p>
        }
      }
    </section>
  `,
})
export class StatusComponent {
  private api = inject(ApiService);
  roll = '';
  results = signal<MyRequest[]>([]);
  searched = signal(false);
  error = signal('');

  search() {
    this.error.set('');
    this.api.myRequests(this.roll.trim()).subscribe({
      next: (r) => { this.results.set(r); this.searched.set(true); },
      error: (e) => this.error.set(errorText(e)),
    });
  }
}
