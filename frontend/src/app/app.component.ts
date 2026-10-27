import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="top">
      <a class="brand" routerLink="/"><span class="dot"></span>College Transport</a>
      <nav>
        <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">Routes</a>
        <a routerLink="/register" routerLinkActive="on">Get a bus pass</a>
        <a routerLink="/status" routerLinkActive="on">Check request</a>
        @if (auth.loggedIn()) {
          <a routerLink="/admin" routerLinkActive="on">Admin</a>
          <button class="link" (click)="logout()">Log out</button>
        } @else {
          <a routerLink="/login" routerLinkActive="on">Admin login</a>
        }
      </nav>
    </header>
    <main><router-outlet /></main>
    <footer class="foot">College Transport Office · Buses leave the stops at the times shown and reach the campus before 8:30.</footer>
  `,
})
export class AppComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
