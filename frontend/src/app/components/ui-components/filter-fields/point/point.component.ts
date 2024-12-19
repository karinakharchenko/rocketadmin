import { Component, Input } from '@angular/core';

import { BaseFilterFieldComponent } from '../base-filter-field/base-filter-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-filter-point',
  templateUrl: './point.component.html',
  styleUrls: ['./point.component.css'],
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule]
})
export class PointFilterComponent extends BaseFilterFieldComponent {
  @Input() value;
}
