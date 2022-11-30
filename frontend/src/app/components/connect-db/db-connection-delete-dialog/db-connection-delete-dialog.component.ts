import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Angulartics2 } from 'angulartics2';
import { ConnectionsService } from 'src/app/services/connections.service';

@Component({
  selector: 'app-db-connection-delete-dialog',
  templateUrl: './db-connection-delete-dialog.component.html',
  styleUrls: ['./db-connection-delete-dialog.component.css']
})
export class DbConnectionDeleteDialogComponent implements OnInit {

  public connectionName: string;
  public reason: string;
  public message: string;
  public submitting: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _connectionsService: ConnectionsService,
    public dialogRef: MatDialogRef<DbConnectionDeleteDialogComponent>,
    public router: Router,
    private angulartics2: Angulartics2
  ) { }

  ngOnInit() {
    this.connectionName = this.data.title || this.data.database;
  }

  deleteConnection() {
    this.submitting = true;
    const metadata = {
      reason: this.reason,
      message: this.message
    }
    this._connectionsService.deleteConnection(this.data.id, metadata)
      .subscribe(() => {
        this.angulartics2.eventTrack.next({
          action: 'Delete connection',
          properties: {
            id: this.data.id,
            title: this.data.title || null,
            reason: this.reason,
            message: this.message
          }
        });
        this.submitting = false;
        this.router.navigate([`/connections-list`]);
        this.dialogRef.close();
      },
        undefined,
        () => { this.submitting = false; }
      );
  }

}
