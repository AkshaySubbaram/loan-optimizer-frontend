import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AmortizationTable } from './amortization-table';

describe('AmortizationTable', () => {
  let component: AmortizationTable;
  let fixture: ComponentFixture<AmortizationTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmortizationTable],
    }).compileComponents();

    fixture = TestBed.createComponent(AmortizationTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
