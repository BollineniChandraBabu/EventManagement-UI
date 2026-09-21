import { Pipe, PipeTransform, inject } from '@angular/core';
import { SensitiveDataService } from '../services/sensitive-data.service';

// See SensitiveEmailPipe: the result also depends on the shared visibility
// signal, not only on the string passed to transform().
@Pipe({ name: 'sensitiveValue', standalone: true, pure: false })
export class SensitiveValuePipe implements PipeTransform {
  private readonly sensitive = inject(SensitiveDataService);
  transform(value: string | null | undefined): string { return this.sensitive.mask(value); }
}
