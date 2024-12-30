import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { AccountDeleteConfirmationComponent } from '../account-delete-confirmation/account-delete-confirmation.component';
import { AccountDeleteDialogComponent } from './account-delete-dialog.component';
import { FormsModule }   from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { Angulartics2Module } from 'angulartics2';

describe('AccountDeleteDialogComponent', () => {
  let component: AccountDeleteDialogComponent;
  let fixture: ComponentFixture<AccountDeleteDialogComponent>;
  let dialog: MatDialog;

  const mockDialogRef = {
    close: () => { }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
      MatDialogModule,
      MatSnackBarModule,
      FormsModule,
      MatRadioModule,
      BrowserAnimationsModule,
      Angulartics2Module.forRoot(),
      AccountDeleteDialogComponent
    ],
    providers: [
      provideHttpClient(),
      { provide: MAT_DIALOG_DATA, useValue: {} },
      { provide: MatDialogRef, useValue: mockDialogRef }
    ]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountDeleteDialogComponent);
    dialog = TestBed.get(MatDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  xit('should open dialog for delete account confirmation', () => {
    component.reason = 'technical-issues';
    component.message = 'I cannot add connection';

    const fakeDeleteUserDialogOpen = spyOn(dialog, 'open');
    component.openDeleteConfirmation();

    expect(fakeDeleteUserDialogOpen).toHaveBeenCalledOnceWith(AccountDeleteConfirmationComponent, {
      width: '20em',
      data: {
        reason: 'technical-issues',
        message: 'I cannot add connection'
      }
    });
  });
});
