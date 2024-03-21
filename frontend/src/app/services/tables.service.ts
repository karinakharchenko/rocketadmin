import { AlertActionType, AlertType } from '../models/alert';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { CustomAction, TableSettings, Widget } from '../models/table';
import { NavigationEnd, Router, RouterEvent } from '@angular/router';
import { catchError, filter, map } from 'rxjs/operators';

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NotificationsService } from './notifications.service';

export enum SortOrdering {
  Ascending = 'ASC',
  Descending = 'DESC'
}

interface TableParams {
  connectionID: string,
  tableName: string,
  requstedPage?: number,
  chunkSize?: number,
  sortColumn?: string,
  sortOrder?: 'ASC' | 'DESC',
  foreignKeyRowName?: string,
  foreignKeyRowValue?: string,
  referencedColumn?:string,
  filters?: object,
  comparators?: object,
  search?: string
}

@Injectable({
  providedIn: 'root'
})

export class TablesService {
  public tableName: string | null = null;

  private tables = new BehaviorSubject<string>('');
  public cast = this.tables.asObservable();

  constructor(
    private _http: HttpClient,
    private router: Router,
    private _notifications: NotificationsService
  ) {
    this.router = router;

    this.router.events
			.pipe(
				filter(
					( event: RouterEvent ) : boolean => {
						return( event instanceof NavigationEnd );
					}
				)
			)
			.subscribe(
				( event: NavigationEnd ) : void => {
          this.setTableName(this.router.routerState.snapshot.root.firstChild.paramMap.get('table-name'));
				}
			)
		;
  }

  setTableName(tableName: string) {
    this.tableName = tableName;
  }

  get currentTableName() {
    return this.tableName;
  }

  fetchTables(connectionID: string, hidden?: boolean) {
    return this._http.get<any>(`/connection/tables/${connectionID}`, {
      params: {
        ...(hidden ? {hidden} : {}),
      }
    })
      .pipe(
        map(res => {
          return res;
        }),
      );
  }

  fetchTable({
    connectionID,
    tableName,
    requstedPage,
    chunkSize,
    sortColumn,
    sortOrder,
    foreignKeyRowName,
    foreignKeyRowValue,
    referencedColumn,
    filters,
    search
  }: TableParams) {
    let foreignKeyRowParamName = foreignKeyRowName === 'autocomplete' ? foreignKeyRowName : `f_${foreignKeyRowName}__eq`;

    if (tableName) {
      return this._http.post<any>(`/table/rows/find/${connectionID}`, { filters }, {
        params: {
          tableName,
          perPage: chunkSize.toString(),
          page: requstedPage.toString(),
          ...(search ? {search} : {}),
          ...(foreignKeyRowValue ? {[foreignKeyRowParamName]: foreignKeyRowValue} : {}),
          ...(referencedColumn ? {referencedColumn} : {}),
          ...(sortColumn ? {sort_by: sortColumn} : {}),
          ...(sortOrder ? {sort_order: sortOrder} : {}),
        }
      })
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          // this._notifications.showErrorSnackbar(err.error.message);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
    }
  }

  fetchTableStructure(connectionID: string, tableName: string) {
    return this._http.get<any>(`/table/structure/${connectionID}`, {
      params: {
        tableName
      }
    })
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }

  fetchTableSettings(connectionID: string, tableName: string) {
    return this._http.get<any>('/settings', {
      params: {
        connectionId: connectionID,
        tableName
      }
    })
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  updateTableSettings(isSettingsExist: boolean, connectionID: string, tableName: string, settings: TableSettings) {

    let method: string;
    if (isSettingsExist) {
      method = 'put'
    } else method = 'post';

    return this._http[method]<any>('/settings', settings, {
      params: {
        connectionId: connectionID,
        tableName
      }
    })
      .pipe(
        map(() => {
          this.tables.next('settings');
          this._notifications.showSuccessSnackbar('Table settings has been updated.')
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  deleteTableSettings(connectionID: string, tableName: string) {
    return this._http.delete<any>('/settings', {
      params: {
        connectionId: connectionID,
        tableName
      }
    })
      .pipe(
        map(() => {
          this.tables.next('settings');
          this._notifications.showSuccessSnackbar('Table settings has been reset.')
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  fetchTableWidgets(connectionID: string, tableName: string) {
    return this._http.get<any>(`/widgets/${connectionID}`, {
      params: {
        tableName
      }
    })
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  updateTableWidgets(connectionID: string, tableName: string, widgets: Widget[]) {
    return this._http.post<any>(`/widget/${connectionID}`, { widgets }, {
      params: {
        tableName
      }
    })
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar('Table widgets has been updated.')
          return res
        }),
        catchError((err) => {
          console.log(err);
          // this._notifications.showErrorSnackbar(err.error.message);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  bulkDelete(connectionID: string, tableName: string, primaryKeys) {
    return this._http.put<any>(`/table/rows/delete/${connectionID}`, primaryKeys, {
      params: {
        tableName
      }
    })
      .pipe(
        map(res => {
          this.tables.next('delete rows');
          this._notifications.showSuccessSnackbar('Rows have been deleted successfully.')
          return res
        }),
        catchError((err) => {
          console.log(err);
          // this._notifications.showErrorSnackbar(err.error.message);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  fetchActions(connectionID: string, tableName: string) {
    return this._http.get<any>(`/table/actions/${connectionID}`, {
      params: {
        tableName
      }
    })
      .pipe(
        map(res => res),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  saveAction(connectionID: string, tableName: string, action: CustomAction) {
    return this._http.post<any>(`/table/action/${connectionID}`, action, {
      params: {
        tableName
      }
    })
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar(`${res.title} action has been created.`);
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  updateAction(connectionID: string, tableName: string, action: CustomAction) {
    return this._http.put<any>(`/table/action/${connectionID}`, action, {
      params: {
        tableName,
        actionId: action.id
      }
    })
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar(`${res.title} action has been updated.`);
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  deleteAction(connectionID: string, tableName: string, actionId: string) {
    return this._http.delete<any>(`/table/action/${connectionID}`, {
      params: {
        actionId
      }
    })
      .pipe(
        map(res => {
          this.tables.next('delete-action');
          this._notifications.showSuccessSnackbar(`${res.title} action has been deleted.`);
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  activateAction(connectionID: string, tableName: string, actionId: string, actionTitle: string, primaryKeys: object, confirmed?: boolean) {
    return this._http.post<any>(`/table/action/activate/${connectionID}`, primaryKeys, {
      params: {
        tableName,
        actionId,
        ...(confirmed ? {confirmed} : {}),
      }
    })
      .pipe(
        map((res) => {
          if (res) {
            return res;
          } else {
            this._notifications.showSuccessSnackbar(`${actionTitle} is done.`);
          }
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }

  activateActions(connectionID: string, tableName: string, actionId: string, actionTitle: string, primaryKeys, confirmed?: boolean) {
    return this._http.post<any>(`/table/actions/activate/${connectionID}`, primaryKeys, {
      params: {
        tableName,
        actionId,
        ...(confirmed ? {confirmed} : {}),
      }
    })
      .pipe(
        map(() => {
          this.tables.next('activate actions');
          this._notifications.showSuccessSnackbar(`${actionTitle} is done for ${primaryKeys.length} rows.`);
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showAlert(AlertType.Error, {abstract: err.error.message, details: err.error.originalMessage}, [
            {
              type: AlertActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissAlert()
            }
          ]);
          return EMPTY;
        })
      );
  }
}
