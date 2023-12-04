import { Component, OnInit, Inject } from '@angular/core';
import { UsersService } from 'src/app/services/users.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UserGroup } from 'src/app/models/user';
import { Angulartics2 } from 'angulartics2';
import { CompanyService } from 'src/app/services/company.service';
import { UserService } from 'src/app/services/user.service';
import { differenceBy } from "lodash";

@Component({
  selector: 'app-user-add-dialog',
  templateUrl: './user-add-dialog.component.html',
  styleUrls: ['./user-add-dialog.component.css']
})
export class UserAddDialogComponent implements OnInit {

  public submitting: boolean = false;
  public groupUserEmail: string = '';
  public responseMessage: string = null;
  public availableMembers;

  constructor(
    @Inject(MAT_DIALOG_DATA) public group: UserGroup,
    private _usersService: UsersService,
    private _userService: UserService,
    private _company: CompanyService,
    private angulartics2: Angulartics2,
    // private dialogRef: MatDialogRef<UserAddDialogComponent>
  ) { }

  ngOnInit(): void {
    this._usersService.cast.subscribe();

    this._userService.cast
        .subscribe(user => {
          this._company.fetchCompanyMembers(user.company.id).subscribe(members => {
            this._usersService.fetcGroupUsers(this.group.id)
            .subscribe(users => {
              this.availableMembers = differenceBy(members, users, 'email');
            })
        })
    });
  }

  joinGroupUser() {
    this.submitting = true;
    this._usersService.addGroupUser(this.group.id, this.groupUserEmail)
      .subscribe((res) => {
          // this.dialogRef.close();
          this.responseMessage = res.message;
          this.submitting = false;
          this.angulartics2.eventTrack.next({
            action: 'User groups: user was added to group successfully',
          });
        },
        () => { },
        () => { this.submitting = false; }
      )
  }
}
