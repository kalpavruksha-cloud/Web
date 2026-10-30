# Admin Investment Table Review

Read-only review on 29 October 2026. No Investment page, source record, formula,
write destination or investment status was changed for this review.

## Actual Source

Admin GET /api/investments prefers Investment_Master. Its detected populated
headers are Client ID, Client Name, Investment Date, Investment Amount (INR), and
Monthly ROI %. Each populated row is one dated client deposit; clients can have
multiple genuine deposits. This is not a complete plan/valuation register.

## Columns Currently Displayed

| Portal column | Current meaning or limitation |
| --- | --- |
| Investment | An investment/plan ID, not the deposited amount. Investment_Master has no matching ID column, so it is blank. |
| Client | Client ID from the deposit row. Client Name and Investment Date exist at source but are not displayed by this table. |
| Plan | Missing from Investment_Master; it must not be inferred from the plan catalogue. |
| Category | Missing from Investment_Master. |
| ROI | The table reads returnRate, populated from Return Rate or ROI, not Monthly ROI %. Therefore the source monthly rate is not shown here. The new payout calendar reads that explicit source separately as monthlyPayoutRate; it does not change this table. |
| Monthly Return | No matching monetary monthly-return column exists. The renderer formats the missing value as INR 0; this is not proof of zero earnings. |
| Current Value | The renderer uses currentValue or principalAmount. With no valuation column, this is the original deposit amount, not current client principal or portfolio after withdrawals. |
| Maturity | No maturity column is present. |
| Status | No investment-status column is present. Pending is the mapper's default, not an actual assessment of funding/account status. |
| Actions | Close needs a stable investment ID, which this source does not supply. |

## Write Limitations

Reads prefer Investment_Master, but createInvestment/updateInvestment still target
Investment or Investments tabs. Neither tab exists in the inspected workbook.
The Create/Close controls therefore are not a fully connected management workflow
for Investment_Master. In addition, the current Create form has no investment-date
input. Do not treat these controls as verified production CRUD for master deposits.

## Recommended Next Change

Align the table to the existing deposit schema (client ID/name, date, principal and
explicit monthly ROI), distinguish unavailable fields from real zeros, and add a
stable investment identifier plus an owner-approved write mapping before enabling
master create/edit/close workflows. Confirm valuation and payout rules rather than
replacing missing values with calculated estimates. This is a separate change from
the read-only payout report drill-down.
