import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-restricted-region',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './restricted-region.component.html',
  styleUrl: './restricted-region.component.css'
})
export class RestrictedRegionComponent {
  readonly currentYear = new Date().getFullYear();
}
