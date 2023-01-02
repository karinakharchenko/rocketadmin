import { Alert, AlertActionType, AlertType } from 'src/app/models/alert';
import { Component, Input, OnInit } from '@angular/core';

import { AccountDeleteDialogComponent } from './account-delete-dialog/account-delete-dialog.component';
import { AuthService } from 'src/app/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { User } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';
import { AccountPasswordConfirmationComponent } from './account-password-confirmation/account-password-confirmation.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.css']
})
export class UserSettingsComponent implements OnInit {
  public currentUser: User = null;
  public submittingDelete: boolean;
  public currentPlan: string;
  public isAnnually: boolean;
  public userName: string;
  public emailVerificationWarning: Alert = {
    id: 10000001,
    type: AlertType.Warning,
    message: 'Your email address is not confirmed. Please check your email or resend confirmation.',
    actions: [
      {
        type: AlertActionType.Button,
        caption: 'Resend confirmation',
        action: () => this.requestEmailVerification()
      }
    ]
  }

  constructor(
    private _userService: UserService,
    private _authService: AuthService,
    public dialog: MatDialog,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = null;
    this._userService.cast
      .subscribe(user => {
        this.currentUser = user;
        this.userName = user.name;

        if (user.subscriptionLevel) {
          this.currentPlan = user.subscriptionLevel;

          if (this.currentPlan.startsWith('ANNUAL_')) {
            this.isAnnually = true;
            this.currentPlan = this.currentPlan.substring(7);
          }

          this.currentPlan = this.currentPlan.slice(0, -5).toLowerCase();
        } else {
          this.currentPlan = "Free"
        }

      });
  }

  requestEmailVerification() {
    this._authService.requestEmailVerifications().subscribe();
  }

  changeEmail() {
    this._userService.requestEmailChange()
      .subscribe((res) => console.log(res));
  }

  confirmDeleteAccount() {
    // event.preventDefault();
    // event.stopImmediatePropagation();
    this.dialog.open(AccountDeleteDialogComponent, {
      width: '32em',
      data: this.currentUser
    });
  }

  openConfirmationDialog() {
    this.dialog.open(AccountPasswordConfirmationComponent, {
      width: '25em',
      data: this.userName
    })
  }

  requestPortalLink(e) {
    this._userService.fetchUser()
      .subscribe(user => {
        this.currentUser = user;
        if (user.portal_link) {
          e.preventDefault();
          // window.location.href = user.portal_link;
          window.open(user.portal_link, '_blank');
        } else {
          this.router.navigate(['/upgrade']);
        }
      })
  }
}
