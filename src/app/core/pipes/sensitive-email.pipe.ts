import { Pipe, PipeTransform, inject } from '@angular/core';
import { SensitiveDataService } from '../services/sensitive-data.service';

@Pipe({ name: 'sensitiveEmail', standalone: true })
export class SensitiveEmailPipe implements PipeTransform {
  private readonly sensitive = inject(SensitiveDataService);
  transform(email: string | null | undefined): string { return this.sensitive.maskEmail(email); }
}
