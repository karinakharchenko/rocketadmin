import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CustomAction, TableForeignKey, TablePermissions, TableRow } from 'src/app/models/table';

import { AccessLevel } from 'src/app/models/user';
import { ActivatedRoute } from '@angular/router';
import { DbTableExportDialogComponent } from '../db-table-export-dialog/db-table-export-dialog.component';
import { DbTableImportDialogComponent } from '../db-table-import-dialog/db-table-import-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { NotificationsService } from 'src/app/services/notifications.service';
import { SelectionModel } from '@angular/cdk/collections';
import { TableStateService } from 'src/app/services/table-state.service';
import { merge } from 'rxjs';
import { normalizeTableName } from '../../../lib/normalize'
import { tap } from 'rxjs/operators';

interface Column {
  title: string,
  selected: boolean
}

@Component({
  selector: 'app-db-table',
  templateUrl: './db-table.component.html',
  styleUrls: ['./db-table.component.css']
})

export class DbTableComponent implements OnInit {

  @Input() name: string;
  @Input() displayName: string;
  @Input() permissions: TablePermissions;
  @Input() accessLevel: AccessLevel;
  @Input() connectionID: string;
  @Input() activeFilters: object;
  @Input() filterComparators: object;
  @Input() selection: SelectionModel<any>;

  @Output() openFilters = new EventEmitter();
  @Output() openPage = new EventEmitter();
  @Output() search = new EventEmitter();
  @Output() removeFilter = new EventEmitter();
  @Output() resetAllFilters = new EventEmitter();
  // @Output() viewRow = new EventEmitter();
  @Output() activateAction = new EventEmitter();
  @Output() activateActions = new EventEmitter();

  public tableData: any;
  // public selection: any;
  public columns: Column[];
  public displayedColumns: string[] = [];
  public columnsToDisplay: string[] = [];
  public searchString: string;
  public staticSearchString: string;
  public actionsColumnWidth: string;
  public bulkActions: CustomAction[];
  public bulkRows: string[];
  public displayedComparators = {
    eq: "=",
    gt: ">",
    lt: "<",
    gte: ">=",
    lte: "<="
  }
  public selectedRow: TableRow = null;

  @Input() set table(value){
    if (value) this.tableData = value;
  }

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private _tableState: TableStateService,
    private _notifications: NotificationsService,
    private route: ActivatedRoute,
    public dialog: MatDialog,
  ) {}

  ngAfterViewInit() {
    this.tableData.paginator = this.paginator;

    this.tableData.sort = this.sort;
    // this.sort.sortChange.subscribe(() => { this.paginator.pageIndex = 0 });

    merge(this.sort.sortChange, this.paginator.page)
      .pipe(
          tap(() => this.loadRowsPage())
      )
      .subscribe();
  }

  ngOnInit() {
    this.searchString = this.route.snapshot.queryParams.search;
    this._tableState.cast.subscribe(row => {
      this.selectedRow = row;
    });
  }

  loadRowsPage() {
    console.log(this.paginator);
    this.tableData.fetchRows({
      connectionID: this.connectionID,
      tableName: this.name,
      requstedPage: this.paginator.pageIndex,
      pageSize: this.paginator.pageSize,
      sortColumn: this.sort.active,
      sortOrder: this.sort.direction.toLocaleUpperCase(),
      filters: this.activeFilters,
      search: this.searchString,
      isTablePageSwitched: true
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.name && changes.name.currentValue && this.paginator) {
      this.paginator.pageIndex = 0;
      this.searchString = '';
    }
  }

  isSortable(column: string) {
    return this.tableData.sortByColumns.includes(column) || !this.tableData.sortByColumns.length;
  }

  isForeignKey(column: string) {
    return this.tableData.foreignKeysList.includes(column);
  }

  getForeignKeyQueryParams(foreignKey: TableForeignKey, cell) {
    return {
      [foreignKey.referenced_column_name]: cell[foreignKey.referenced_column_name]
    }
  }

  isWidget(column: string) {
    if (this.tableData.widgetsList) return this.tableData.widgetsList.includes(column);
  }

  getWidgetValue(column: string, value: string) {
    if (this.tableData.widgets[column].widget_type === 'Select' && this.tableData.selectWidgetsOptions) {
        const fieldOptions = this.tableData.selectWidgetsOptions[column];
        if (fieldOptions) {
          const cellValue = fieldOptions.find(option => option.value === value);
            if (cellValue) return cellValue.label
        }
    }
    return value;
  }

  getCellValue(foreignKey: TableForeignKey, cell) {
    const identityColumnName = Object.keys(cell).find(key => key !== foreignKey.referenced_column_name);
    if (identityColumnName) {
      return cell[identityColumnName]
    } else {
      return cell[foreignKey.referenced_column_name]
    }
  }

  getFiltersCount(activeFilters: object) {
    if (activeFilters) return Object.keys(activeFilters).length;
    return 0;
  }

  handleOpenFilters() {
    this.openFilters.emit({
      structure: this.tableData.structure,
      foreignKeysList: this.tableData.foreignKeysList,
      foreignKeys: this.tableData.foreignKeys,
      widgets: this.tableData.widgets
    });
    this.searchString = '';
  }

  handleSearch() {
    this.searchString = this.searchString.trim();
    this.staticSearchString = this.searchString;
    this.search.emit(this.searchString);
  }

  handleOpenExportDialog() {
    this.dialog.open(DbTableExportDialogComponent, {
      width: '25em',
      data: {
        connectionID: this.connectionID,
        tableName: this.name,
        sortColumn: this.sort.active,
        sortOrder: this.sort.direction.toLocaleUpperCase(),
        filters: this.activeFilters,
        search: this.searchString
      }
    })
  }

  handleOpenImportDialog() {
    this.dialog.open(DbTableImportDialogComponent, {
      width: '25em',
      data: {
        connectionID: this.connectionID,
        tableName: this.name,
      }
    })
  }

  clearSearch () {
    this.searchString = null;
    this.search.emit(this.searchString);
  }

  getFilter(activeFilter: {key: string, value: object}) {
    const displayedName = normalizeTableName(activeFilter.key);
    const comparator = Object.keys(activeFilter.value)[0];
    const filterValue = Object.values(activeFilter.value)[0];
    if (comparator == 'startswith') {
      return `${displayedName} = ${filterValue}...`
    } else if (comparator == 'endswith') {
      return `${displayedName} = ...${filterValue}`
    } else if (comparator == 'contains') {
      return `${displayedName} = ...${filterValue}...`
    } else if (comparator == 'empty') {
      return `${displayedName} = ' '`
    } else {
      return `${displayedName} ${this.displayedComparators[Object.keys(activeFilter.value)[0]]} ${filterValue}`
    }
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    return this.tableData.rowsSubject.value.length === this.selection.selected.length;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.tableData.rowsSubject.value);
    }
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: any): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.position + 1}`;
  }

  stashUrlParams() {
    this._tableState.setBackUrlParams(this.paginator.pageIndex, this.paginator.pageSize, this.sort.active, this.sort.direction);
    this.stashFilters();
  }

  stashFilters() {
    this._tableState.setBackUrlFilters(this.activeFilters);
  }

  getPrimaryKeys() {
    return this.selection.selected
      .map(row => Object.assign({}, ...this.tableData.keyAttributes.map((primaryKey) => ({[primaryKey.column_name]: row[primaryKey.column_name]}))));
  }

  getIdentityFieldsValues() {
    if (this.tableData.identityColumn) return this.selection.selected.map(row => row[this.tableData.identityColumn]);
    return null;
  }

  handleAction(e, action, element) {
    e.stopPropagation();

    console.log(element);

    this.activateActions.emit({
      action,
      primaryKeys: [this.tableData.getQueryParams(element)],
      ...(this.tableData.identityColumn ? {identityFieldValues: [element[this.tableData.identityColumn]]} : null)
    })
  }

  handleActions(action) {
    const primaryKeys = this.getPrimaryKeys();
    const identityFieldValues = this.getIdentityFieldsValues();

    this.activateActions.emit({
      action,
      primaryKeys,
      identityFieldValues
    })
  }

  handleDeleteRow(e, element){
    e.stopPropagation();
    this.stashFilters();

    this.activateActions.emit({
      action: {
          title: 'Delete row',
          type: 'multiple',
          require_confirmation: true
      },
      primaryKeys: [this.tableData.getQueryParams(element)],
      ...(this.tableData.identityColumn ? {identityFieldValues: [element[this.tableData.identityColumn]]} : null)
    })
  }

  handleViewRow(row: TableRow) {
    this._tableState.selectRow({...row, link: `/dashboard/${this.connectionID}/${this.name}/entry`});
  }

  isRowSelected(primaryKeys) {
    return this.selectedRow && JSON.stringify(this.selectedRow.primaryKeys) === JSON.stringify(primaryKeys);
  }

  showCopyNotification(message: string) {
    this._notifications.showSuccessSnackbar(message);
  }
}
