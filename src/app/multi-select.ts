import { Component, ElementRef, inject, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-multi-select',
  template: `
    <span class="field-label">{{ label() }}</span>
    <details
      #dropdown
      class="attribute-select"
      [class.quality-select]="fieldKey() === 'quality'"
      (keydown.escape)="dropdown.open = false; summary.focus(); $event.stopPropagation()"
    >
      <summary
        #summary
        [attr.aria-label]="
          label() + ': ' + (selected().length ? selected().join(', ') : allLabel())
        "
      >
        <span>{{ selected().length ? selected().join(', ') : allLabel() }}</span
        ><span aria-hidden="true">⌄</span>
      </summary>
      <div
        class="attribute-options"
        [class.quality-options]="fieldKey() === 'quality'"
        role="group"
        [attr.aria-label]="label()"
      >
        @for (option of options(); track option) {
          <label
            ><input
              type="checkbox"
              [checked]="selected().includes(option)"
              (change)="toggle(option)"
              [attr.aria-label]="label() + ' ' + option"
            /><span>{{ option }}</span></label
          >
        } @empty {
          <p>Sem opções nesta busca.</p>
        }
        <p>Nenhuma marcada = todas</p>
      </div>
    </details>
  `,
  styleUrl: './multi-select.css',
  host: { '(document:click)': 'closeOutside($event)', '[attr.data-filter]': 'fieldKey()' },
})
export class MultiSelect {
  readonly label = input.required<string>();
  readonly fieldKey = input.required<string>();
  readonly allLabel = input('Todas as opções');
  readonly options = input<string[]>([]);
  readonly selected = input<string[]>([]);
  readonly selectedChange = output<string[]>();
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly dropdown = viewChild<ElementRef<HTMLDetailsElement>>('dropdown');
  toggle(value: string): void {
    this.selectedChange.emit(
      this.selected().includes(value)
        ? this.selected().filter((item) => item !== value)
        : [...this.selected(), value],
    );
  }
  closeOutside(event: Event): void {
    if (event.target instanceof Node && !this.host.nativeElement.contains(event.target)) {
      const dropdown = this.dropdown()?.nativeElement;
      if (dropdown) dropdown.open = false;
    }
  }
}
