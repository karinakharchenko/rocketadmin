import { ActivatedRoute, Router } from '@angular/router';
import { Component, NgZone, OnInit } from '@angular/core';
import { TableField, TableForeignKey, Widget } from 'src/app/models/table';
import { UIwidgets, fieldTypes } from 'src/app/consts/field-types';

import { ConnectionsService } from 'src/app/services/connections.service';
import { Location } from '@angular/common';
import { TableRowService } from 'src/app/services/table-row.service';
import { TablesService } from 'src/app/services/tables.service';
import { normalizeTableName } from '../../lib/normalize';
import { DBtype } from 'src/app/models/connection';

@Component({
  selector: 'app-db-table-row-edit',
  templateUrl: './db-table-row-edit.component.html',
  styleUrls: ['./db-table-row-edit.component.css']
})
export class DbTableRowEditComponent implements OnInit {
  public loading: boolean = true;
  public connectionID: string | null = null;
  public tableName: string | null = null;
  public normalizedTableName: string | null = null;
  public tableRowValues: Object;
  public tableRowStructure: Object;
  public tableRowRequiredValues: Object;
  public readonlyFields: string[];
  public keyAttributes: object;
  public isPrimaryKeyUpdated: boolean;
  public tableTypes: Object;
  public tableWidgets: Object;
  public tableWidgetsList: string[] = [];
  public shownRows;
  public submitting = false;
  public UIwidgets = UIwidgets;
  public rowError: string = null;

  public tableForeignKeys: TableForeignKey[];

  originalOrder = () => { return 0; }

  constructor(
    private _connections: ConnectionsService,
    private _tables: TablesService,
    private _tableRow: TableRowService,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    public router: Router,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.loading = true;
    this.connectionID = this._connections.currentConnectionID;
    this.tableName = this._tables.currentTableName;
    this.normalizedTableName = normalizeTableName(this.tableName);

    this.route.queryParams.subscribe((params) => {
      if (Object.keys(params).length === 0) {
        this._tables.fetchTableStructure(this.connectionID, this.tableName)
          .subscribe(res => {
            this.readonlyFields = res.readonly_fields;
            this.tableForeignKeys = res.foreignKeys;
            this.shownRows = res.structure.filter((field: TableField) => !(field.column_default?.startsWith('nextval') || field.auto_increment));
            const allowNullFields = res.structure
              .filter((field: TableField) => field.allow_null)
              .map((field: TableField) => field.column_name);
            this.tableRowValues = Object.assign({}, ...this.shownRows.map((field: TableField) => ({[field.column_name]: allowNullFields.includes(field.column_name) ? null : ''})));
            res.table_widgets && this.setWidgets(res.table_widgets);
            this.setRowStructure(res.structure);
            this.loading = false;
          })
      } else {
        this.keyAttributes = params;
        this._tableRow.fetchTableRow(this.connectionID, this.tableName, params)
          .subscribe(res => {
            this.readonlyFields = res.readonly_fields;
            this.tableForeignKeys = res.foreignKeys;
            this.shownRows = res.structure.filter((field: TableField) => !(field.column_default?.startsWith('nextval') || field.auto_increment));
            this.tableRowValues = Object.assign({}, ...this.shownRows.map((field: TableField) => ({[field.column_name]: res.row[field.column_name]})));
            res.table_widgets && this.setWidgets(res.table_widgets);
            this.setRowStructure(res.structure);
            this.loading = false;
          },
          (error) => {
            this.rowError = error.error.message;
            this.loading = false;
            console.log('this.rowError');
            console.log(this.rowError);
          })
      }
    })
  }

  get inputs() {
    return fieldTypes[this._connections.currentConnection.type]
  }

  setRowStructure(structure: TableField[]){

    this.tableRowStructure = Object.assign({}, ...structure.map((field: TableField) => {
      return {[field.column_name]: field}
    }))

    const foreignKeysList = this.tableForeignKeys.map((field: TableForeignKey) => {return field['column_name']});
    this.tableTypes = Object.assign({}, ...structure.map((field: TableField) => {
      if (field.data_type === 'tinyint' && field.character_maximum_length === 1 )
      return {[field.column_name]: 'boolean'}
      if (foreignKeysList.includes(field.column_name))
      return {[field.column_name]: 'foreign key'}
        return {[field.column_name]: field.data_type}
    }));

    this.tableRowRequiredValues = Object.assign({}, ...structure.map((field: TableField) => {
      return {[field.column_name]: field.allow_null === false && field.column_default === null}
    }));
  }

  setWidgets(widgets: Widget[]) {
    this.tableWidgetsList = widgets.map((widget: Widget) => widget.field_name);
    this.tableWidgets = Object.assign({}, ...widgets
      .map((widget: Widget) => {
        return {
          [widget.field_name]: widget
        }
      })
    );
  }

  trackByFn(index: number) {
    return index; // or item.id
  }

  getRelations = (columnName: string) => {
    const relation = this.tableForeignKeys.find(relation => relation.column_name === columnName);
    return relation;
  }

  isReadonly(columnName: string) {
    return this.readonlyFields.includes(columnName);
  }

  isWidget(columnName: string) {
    return this.tableWidgetsList.includes(columnName);
  }

  updateField = (updatedValue: any, field: string) => {
    if (typeof(updatedValue) === 'object' && updatedValue !== null) {
      for (const prop of Object.getOwnPropertyNames(this.tableRowValues[field])) {
        delete this.tableRowValues[field][prop];
      }
      Object.assign(this.tableRowValues[field], updatedValue);
    } else {
      this.tableRowValues[field] = updatedValue;
    };

    if (this.keyAttributes && Object.keys(this.keyAttributes).includes(field)) {
      this.isPrimaryKeyUpdated = true
    };
  }

  addRow(continueEditing?: boolean) {
    this.submitting = true;

    //crutch
    if (this._connections.currentConnection.type === DBtype.MySQL) {
      const datetimeFields = Object.entries(this.tableTypes).filter(([key, value]) => value === 'datetime');
      for (const datetimeField of datetimeFields) {
        this.tableRowValues[datetimeField[0]] = this.tableRowValues[datetimeField[0]].split('.')[0];
      }
    }
    //end crutch

    this._tableRow.addTableRow(this.connectionID, this.tableName, this.tableRowValues)
      .subscribe((res) => {

        this.keyAttributes = {};
        for (var i = 0; i < res.primaryColumns.length; i++) {
          this.keyAttributes[res.primaryColumns[i].column_name] = res.row[res.primaryColumns[i].column_name];
        }
        this.ngZone.run(() => {
          if (continueEditing) {
            this.router.navigate([`/dashboard/${this.connectionID}/${this.tableName}/entry`], { queryParams: this.keyAttributes });
          } else {
            this.router.navigate([`/dashboard/${this.connectionID}/${this.tableName}`]);
          }
        });
        this.submitting = false;
      },
      () => {this.submitting = false},
      () => {this.submitting = false}
    )
  }

  updateRow(continueEditing?: boolean) {
    this.submitting = true;

    //crutch
      if (this._connections.currentConnection.type === DBtype.MySQL) {
        const datetimeFields = Object.entries(this.tableTypes)
          .filter(([key, value]) => value === 'datetime');
        for (const datetimeField of datetimeFields) {
          this.tableRowValues[datetimeField[0]] = this.tableRowValues[datetimeField[0]].split('.')[0];
        }
      }
    //end crutch

    this._tableRow.updateTableRow(this.connectionID, this.tableName, this.keyAttributes, this.tableRowValues)
      .subscribe((res) => {
        this.ngZone.run(() => {
          if (continueEditing) {
            if (this.isPrimaryKeyUpdated) {
              this.ngZone.run(() => {
                let params = {};
                Object.keys(this.keyAttributes).forEach((key) => {
                  params[key] = res.row[key];
                });
                this.router.navigate([`/dashboard/${this.connectionID}/${this.tableName}/entry`], {
                  queryParams: params
                });
              });
            }
          } else {
            this.router.navigate([`/dashboard/${this.connectionID}/${this.tableName}`]);
          }
        });
      },
      undefined,
      () => {this.submitting = false}
    )
  }
}
