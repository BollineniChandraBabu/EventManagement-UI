import { Pipe, PipeTransform, inject } from '@angular/core';
import { SensitiveDataService } from '../services/sensitive-data.service';

@Pipe({ name: 'sensitiveValue', standalone: true })
export class SensitiveValuePipe implements PipeTransform {
  private readonly sensitive = inject(SensitiveDataService);
  transform(value: string | null | undefined): string { return this.sensitive.mask(value); }
}
