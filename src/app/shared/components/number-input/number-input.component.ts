import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';

/**
 * Single source of truth for numeric inputs across the system.
 * Wraps PrimeNG's p-inputnumber with a fixed, consistent format:
 * grouped thousands and always exactly 3 decimal digits (e.g. 15000 -> 15,000.000).
 */
@Component({
  selector: 'app-number-input',
  standalone: true,
  imports: [FormsModule, InputNumberModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NumberInputComponent),
      multi: true,
    },
  ],
  templateUrl: './number-input.component.html',
  styles: [':host { display: block; width: 100%; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumberInputComponent implements ControlValueAccessor {
  inputId = input<string | undefined>(undefined);
  placeholder = input('');
  min = input<number | undefined>(undefined);
  max = input<number | undefined>(undefined);
  suffix = input<string | undefined>(undefined);
  showButtons = input(false);
  readonlyInput = input(false, { alias: 'readonly' });
  invalid = input(false);
  styleClass = input('');
  inputStyleClass = input('');
  disabledInput = input(false, { alias: 'disabled' });

  value = signal<number | null>(null);
  controlDisabled = signal(false);

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  get isDisabled(): boolean {
    return this.disabledInput() || this.controlDisabled();
  }

  writeValue(value: number | null | undefined): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.controlDisabled.set(isDisabled);
  }

  handleValueChange(value: number | null): void {
    this.value.set(value);
    this.onChange(value);
  }

  markTouched(): void {
    this.onTouched();
  }
}
