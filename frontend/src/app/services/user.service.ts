import { BannerActionType, BannerType } from '../models/banner';
import { BehaviorSubject, EMPTY } from 'rxjs';
import { SubscriptionPlans, User } from '../models/user';
import { catchError, map } from 'rxjs/operators';

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NotificationsService } from './notifications.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  public initialUserState = {
    id: '',
    isActive: false,
    email: '',
    createdAt: '',
    portal_link: '',
    subscriptionLevel: SubscriptionPlans.free
  }

  private user = new BehaviorSubject<any>(this.initialUserState);
  public cast = this.user.asObservable();

  constructor(
    private _http: HttpClient,
    private _notifications: NotificationsService
  ) { }

  get user$(){
    return this.user.asObservable();
  }

  fetchUser() {
    return this._http.get<any>('/user')
      .pipe(
        map(res => {
          console.log(res);
          this.user.next(res);
          return res
        }),
        catchError((err) => {
          console.log(err);
          this._notifications.showErrorSnackbar(err.error.message);
          return EMPTY;
        })
      );
  }

  sendUserAction(message: string) {
    return this._http.post<any>('/action', {message: message})
    .pipe(
      map(res => res),
      catchError((err) => {
        console.log(err);
        return EMPTY;
      })
    );
  }

  upgradeUser(subscriptionLevel) {
    return this._http.post<any>(`/user/subscription/upgrade`, {subscriptionLevel})
      .pipe(
        map(res => {
          this._notifications.showSuccessSnackbar('Your plan has been upgraded successfully.');
          return res;
        }),
        catchError((err) => {
          this._notifications.showBanner(BannerType.Error, err.error.message, [
            {
              type: BannerActionType.Link,
              caption: 'Settings',
              to: '/user-settings'
            },
            {
              type: BannerActionType.Button,
              caption: 'Dismiss',
              action: (id: number) => this._notifications.dismissBanner()
            }
          ]);
          console.log(err);
          return EMPTY;
        })
      );
  }

  requestEmailChange() {
    return this._http.get<any>(`/user/email/change/request`)
    .pipe(
      map(res => {
        this._notifications.showBanner(BannerType.Info, 'Link has been sent to your email. Please check it.', [
          {
            type: BannerActionType.Button,
            caption: 'Dismiss',
            action: (id: number) => this._notifications.dismissBanner()
          }
        ]);
        return res
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showBanner(BannerType.Error, err.error.message, [
          {
            type: BannerActionType.Button,
            caption: 'Dismiss',
            action: (id: number) => this._notifications.dismissBanner()
          }
        ]);
        return EMPTY;
      })
    );
  }

  changeEmail(token: string, newEmail: string) {
    return this._http.post<any>(`/user/email/change/verify/${token}`, {email: newEmail})
    .pipe(
      map(res => {
        this._notifications.showSuccessSnackbar('You email has been changed successfully.');
        return res
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showBanner(BannerType.Error, err.error.message, [
          {
            type: BannerActionType.Button,
            caption: 'Dismiss',
            action: (id: number) => this._notifications.dismissBanner()
          }
        ]);
        return EMPTY;
      })
    );
  }

  requestPasswordReset(email: string) {
    return this._http.post<any>(`/user/password/reset/request`, { email })
    .pipe(
      map(res => {
        this._notifications.showBanner(BannerType.Success, 'Check your email.', [
          {
            type: BannerActionType.Button,
            caption: 'Dismiss',
            action: (id: number) => this._notifications.dismissBanner()
          }
        ]);
        return res
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showBanner(BannerType.Error, err.error.message, [
          {
            type: BannerActionType.Button,
            caption: 'Dismiss',
            action: (id: number) => this._notifications.dismissBanner()
          }
        ]);
        return EMPTY;
      })
    );
  }

  resetPassword(token: string, newPassword: string) {
    return this._http.post<any>(`/user/password/reset/verify/${token}`, {password: newPassword})
    .pipe(
      map(res => {
        this._notifications.showSuccessSnackbar('Your password has been reset successfully.');
        return res
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showBanner(BannerType.Error, err.error.message, [
          {
            type: BannerActionType.Button,
            caption: 'Dismiss',
            action: (id: number) => this._notifications.dismissBanner()
          }
        ]);
        return EMPTY;
      })
    );
  }

  changePassword(oldPassword: string, newPassword: string, email: string) {
    return this._http.post<any>(`/user/password/change/`, {email, oldPassword, newPassword})
    .pipe(
      map(res => {
        this._notifications.showSuccessSnackbar('Your password has been changed successfully.');
        return res
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showBanner(BannerType.Error, err.error.message, [
          {
            type: BannerActionType.Button,
            caption: 'Dismiss',
            action: (id: number) => this._notifications.dismissBanner()
          }
        ]);
        return EMPTY;
      })
    );
  }

  deleteAccount(metadata) {
    return this._http.put<any>(`/user/delete`, metadata)
    .pipe(
      map(() => {
        this.user.next('delete');
        this._notifications.showSuccessSnackbar('You account has been deleted.');
      }),
      catchError((err) => {
        console.log(err);
        this._notifications.showBanner(BannerType.Error, err.error.message, [
          {
            type: BannerActionType.Button,
            caption: 'Dismiss',
            action: (id: number) => this._notifications.dismissBanner()
          }
        ]);
        return EMPTY;
      })
    );
  }
}
