import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-restricted-region',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="restricted-shell">
      <section class="restricted-card">
        <h1>Access Restricted</h1>
        <p>
          This application is currently available only in
          <strong>Andhra Pradesh</strong> and <strong>Telangana</strong> (India).
        </p>
      </section>
    </main>
  `,
  styles: [
    `
      .restricted-shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f6f7ff;
        padding: 24px;
      }

      .restricted-card {
        width: min(540px, 100%);
        border: 1px solid #e6e8ff;
        border-radius: 20px;
        box-shadow: 0 20px 48px rgba(89, 98, 194, 0.14);
        background: #fff;
        padding: 24px;
        text-align: center;
      }

      h1 {
        margin: 0 0 12px;
        color: #5e66d8;
      }

      p {
        margin: 0;
        color: #6d73a9;
        line-height: 1.6;
      }
    `
  ]
})
export class RestrictedRegionComponent {}
