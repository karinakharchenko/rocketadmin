import { Component, Input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { BaseRowFieldComponent } from '../base-row-field/base-row-field.component';
import { format } from 'date-fns'

@Component({
  selector: 'app-row-date',
  templateUrl: './date.component.html',
  styleUrls: ['./date.component.css'],
  imports: [CommonModule, MatFormFieldModule, MatInputModule, FormsModule]
})
export class DateRowComponent extends BaseRowFieldComponent {
  @Input() value: string;

  static type = 'datetime';
  public date: string;

  ngOnInit(): void {
    super.ngOnInit();
    if (this.value) {
      const datetime = new Date(this.value);
      this.date = format(datetime, 'yyyy-MM-dd');
    }
  }

  onDateChange() {
    this.onFieldChange.emit(this.date);
  }
}
