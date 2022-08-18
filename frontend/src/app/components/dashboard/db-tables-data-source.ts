import { Alert, AlertActionType, AlertType } from 'src/app/models/alert';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { TableForeignKey, Widget } from 'src/app/models/table';
import { catchError, finalize } from 'rxjs/operators';

import { AccessLevel } from 'src/app/models/user';
import { CollectionViewer } from '@angular/cdk/collections';
import { ConnectionsService } from 'src/app/services/connections.service';
import { DataSource } from '@angular/cdk/table';
import { MatPaginator } from '@angular/material/paginator';
import { NotificationsService } from 'src/app/services/notifications.service';
// import { MatSort } from '@angular/material/sort';
import { TablesService } from 'src/app/services/tables.service';
import { filter } from "lodash";
import { format } from 'date-fns'
import { normalizeFieldName } from 'src/app/lib/normalize';

interface Column {
  title: string,
  normalizedTitle: string,
  selected: boolean
}

interface RowsParams {
  connectionID: string,
  tableName: string,
  sortColumn?: string,
  requstedPage?: number,
  sortOrder?: 'ASC' | 'DESC',
  filters?: object,
  comparators?: object,
  isTablePageSwitched?: boolean
}

export class TablesDataSource implements DataSource<Object> {

  private rowsSubject = new BehaviorSubject<Object[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public loading$ = this.loadingSubject.asObservable();
  public paginator: MatPaginator;
  // public sort: MatSort;

  public keyAttributes;
  public columns: Column[];
  public dataColumns: string[];
  public dataNormalizedColumns: object;
  public displayedColumns: string[];
  public displayedDataColumns: string[];
  public sortByColumns: string[];
  public foreignKeysList: string[];
  public foreignKeys: TableForeignKey[];
  public widgetsList: string[];
  public widgets: Widget[];
  public widgetsCount: number = 0;
  public selectWidgetsOptions: object;

  public alert_primaryKeysInfo: Alert;
  public alert_settingsInfo: Alert;
  public alert_widgetsWarning: Alert;

  constructor(
    private _tables: TablesService,
    private _notifications: NotificationsService,
    private _connections: ConnectionsService
  ) {}

  connect(collectionViewer: CollectionViewer): Observable<Object[]> {
    return this.rowsSubject.asObservable();
  }

  disconnect(collectionViewer: CollectionViewer): void {
      this.rowsSubject.complete();
      this.loadingSubject.complete();
  }

  formatField(value, type) {
    const dateTimeTypes = [
      'timestamp without time zone',
      'timestamp with time zone',
      'abstime',
      'realtime',
      'datetime',
      'timestamp'
    ]

    if (value && type === 'time') {
      return value
    } else if (value && type === 'date') {
      const datetimeValue = new Date(value);
      return format(datetimeValue, "P")
    } else if (value && dateTimeTypes.includes(type)) {
      const datetimeValue = new Date(value);
      return format(datetimeValue, "P p")
    } else if (type === 'boolean') {
      if (value || value ===  1) return '✓'
      else if (value === false || value === 0) return '✕'
      else return '—'
    } else if (type === 'json') {
      return JSON.stringify(value)
    }
    return value;
  }

  formatRow(row, columns) {
    const rowToFormat = {};
    for (const [columnName, columnStructute] of columns) {
      let type = '';
      if (columnStructute.data_type === 'tinyint' && (columnStructute.character_maximum_length === 1)) {
        type = 'boolean'
      } else type = columnStructute.data_type;
      rowToFormat[columnName] = this.formatField(row[columnName], type);
    }
    return rowToFormat;
  }

  fetchRows({
    connectionID,
    tableName,
    requstedPage,
    sortColumn,
    sortOrder,
    filters, comparators,
    isTablePageSwitched
  }: RowsParams) {
      this.loadingSubject.next(true);
      this.alert_primaryKeysInfo = null;
      this.alert_settingsInfo = null;
      this.alert_widgetsWarning = null;
      const fetchedTable = this._tables.fetchTable({
        connectionID,
        tableName,
        requstedPage: requstedPage + 1 || 1,
        chunkSize: this.paginator?.pageSize || 30,
        sortColumn,
        sortOrder,
        filters,
        comparators
      });

      if (fetchedTable) {
        fetchedTable
        .pipe(
            catchError(() => of([])),
            finalize(() => this.loadingSubject.next(false))
        )
        .subscribe((res: any) => {
          const columns = res.structure
            .reduce((items, item) => {
              items.set(item.column_name, item)
              return items;
            }, new Map());

          const formattedRows = res.rows.map(row => this.formatRow(row, columns));
          this.rowsSubject.next(formattedRows);
          this.keyAttributes = res.primaryColumns;

          if (isTablePageSwitched === undefined) this.columns = res.structure
            .filter (item => item.isExcluded === false)
            .map((item, index) => {
              if (res.columns_view && res.columns_view.length !== 0) {
                return {
                  title: item.column_name,
                  normalizedTitle: normalizeFieldName(item.column_name),
                  selected: res.columns_view.includes(item.column_name)
                }
              } else {
                if (index < 6) {
                  return {
                    title: item.column_name,
                    normalizedTitle: normalizeFieldName(item.column_name),
                    selected: true
                  }
                }
                return {
                  title: item.column_name,
                  normalizedTitle: normalizeFieldName(item.column_name),
                  selected: false
                }
              }

            });

          this.dataColumns = this.columns.map(column => column.title);
          this.dataNormalizedColumns = this.columns
            .reduce((normalizedColumns, column) => (normalizedColumns[column.title] = column.normalizedTitle, normalizedColumns), {})
          this.displayedDataColumns = (filter(this.columns, column => column.selected === true)).map(column => column.title);
          if (this.keyAttributes.length) {
            this.displayedColumns = [...this.displayedDataColumns, 'actions'];
          } else {
            this.displayedColumns = [...this.displayedDataColumns];
            this.alert_primaryKeysInfo = {
              id: 10000,
              type: AlertType.Info,
              message: 'We can not provide editing for this table because it does not have primary keys. Please add primary key in your database.',
              actions: [
                {
                  type: AlertActionType.Anchor,
                  caption: 'Instruction',
                  to: 'https://help.autoadmin.org/'
                }
              ]
            }
          };

          this.sortByColumns = res.sortable_by;

          this.foreignKeysList = res.foreignKeys.map((field) => {return field['column_name']});
          this.foreignKeys = Object.assign({}, ...res.foreignKeys.map((foreignKey: TableForeignKey) => ({[foreignKey.column_name]: foreignKey})));

          if (res.widgets) {
            this.widgetsList = res.widgets.map((widget: Widget) => {return widget['field_name']});
            this.widgets = Object.assign({}, ...res.widgets.map((widget: Widget) => ({[widget.field_name]: widget})));
            this.widgetsCount = this.widgetsList.length;

            /*** for select widget ***/
            const selectWidgets = res.widgets.filter((widget: Widget) => widget.widget_type === 'Select');
            this.selectWidgetsOptions =
            Object.assign({}, ...selectWidgets.map((widget: Widget) => {
              if (widget.widget_params.options) {
                return {[widget.field_name]: widget.widget_params.options}
              } else {
                this.alert_widgetsWarning = {
                  id: 10002,
                  type: AlertType.Warning,
                  message: `Select widget for ${widget.field_name} column is configured incorrectly.`,
                  actions: [
                    {
                      type: AlertActionType.Anchor,
                      caption: 'Instruction',
                      to: 'https://help.autoadmin.org/'
                    }
                  ]
                }
              }
            }))
          }


          const widgetsConfigured = res.widgets && res.widgets.length;
          if (!res.configured && !widgetsConfigured
            && this._connections.connectionAccessLevel !== AccessLevel.None
            && this._connections.connectionAccessLevel !== AccessLevel.Readonly)
            this.alert_settingsInfo = {
              id: 10001,
              type: AlertType.Info,
              message: 'This table is not configured.',
              actions: [
                {
                  type: AlertActionType.Link,
                  caption: 'Settings',
                  to: 'settings'
                },
                {
                  type: AlertActionType.Link,
                  caption: 'Widgets',
                  to: 'widgets'
                }
              ]
            };

          if (this.paginator) this.paginator.pageSize = res.pagination.perPage;
          if (this.paginator) this.paginator.length = res.pagination.total;
      });
    }
  }

  changleColumnList() {
    this.displayedDataColumns = (filter(this.columns, column => column.selected === true)).map(column => column.title);

    if (this.keyAttributes.length) {
      this.displayedColumns = [...this.displayedDataColumns, 'actions']
    } else {
      this.displayedColumns = [...this.displayedDataColumns]
    };
  }

  getQueryParams(row) {
    const params = Object.fromEntries(this.keyAttributes.map((column) => [column.column_name, row[column.column_name]]));
    return params;
  }
}