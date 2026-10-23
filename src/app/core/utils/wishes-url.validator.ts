import { AbstractControl, ValidationErrors } from '@angular/forms';
import { wishesUrlError } from './wishes-url';

/** Form validator for the optional "custom wishes page" link. */
export function wishesUrlValidator(control: AbstractControl): ValidationErrors | null {
  const message = wishesUrlError(control.value);
  return message ? { wishesUrl: message } : null;
}
