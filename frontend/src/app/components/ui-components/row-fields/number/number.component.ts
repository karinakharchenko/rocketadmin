import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { normalizeFieldName } from '../../../../lib/normalize';

@Component({
  selector: 'app-row-number',
  templateUrl: './number.component.html',
  styleUrls: ['./number.component.css']
})
export class NumberRowComponent implements OnInit {

  @Input() key: string;
  @Input() label: string;
  @Input() value: number;
  @Input() required: boolean;
  @Input() readonly: boolean;
  @Input() disabled: boolean;

  @Output() onFieldChange = new EventEmitter();

  static type = 'number';
  public normalizedLabel: string;

  constructor() { }

  ngOnInit(): void {
    this.normalizedLabel = normalizeFieldName(this.label);
  }

}
