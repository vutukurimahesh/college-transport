import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { errorText } from '../services/api.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="wrap narrow">
      <h1>Admin login</h1>
      <form class="form" (ngSubmit)="login()">
        <label>Username <input name="u" [(ngModel)]="username" required autocomplete="username"></label>
        <label>Password <input name="p" type="password" [(ngModel)]="password" required autocomplete="current-password"></label>
        @if (error()) { <p class="msg err">{{ error() }}</p> }
        <button class="btn" type="submit" [disabled]="!username || !password">Log in</button>
      </form>
    </section>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  username = '';
  password = '';
  error = signal('');

  login() {
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigateByUrl('/admin'),
      error: (e) => this.error.set(errorText(e)),
    });
  }
}
