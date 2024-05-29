import { Component, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';

@Component({
  selector: 'app-filter-long-text',
  templateUrl: './long-text.component.html',
  styleUrls: ['./long-text.component.css']
})
export class LongTextFilterComponent extends BaseFilterFieldComponent {
  @Input() value: string;

  static type = 'text';
  public rowsCount: string;

  ngOnInit(): void {
    super.ngOnInit();
    if (this.widgetStructure && this.widgetStructure.widget_params) {
      this.rowsCount = this.widgetStructure.widget_params.rows
    } else {
      this.rowsCount = '4'
    };
  }

}
