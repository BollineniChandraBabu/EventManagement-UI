import { Pipe, PipeTransform, inject } from '@angular/core';
import { SensitiveDataService } from '../services/sensitive-data.service';

// The visibility setting is a signal rather than an input to this pipe. Keep the
// pipe impure so Angular asks it for the current value whenever that signal
// changes, even if the email itself did not.
@Pipe({ name: 'sensitiveEmail', standalone: true, pure: false })
export class SensitiveEmailPipe implements PipeTransform {
  private readonly sensitive = inject(SensitiveDataService);
  transform(email: string | null | undefined): string { return this.sensitive.maskEmail(email); }
}
