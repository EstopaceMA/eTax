import type { Form1701QData } from "./types";
import dummyFixture from "./fixtures/dummy-1701q.json";

/**
 * Internally-consistent dummy dataset for the 8% flat-rate path.
 *
 * Worked math (whole pesos, TRAIN law Schedule II):
 *   47  Sales/receipts this quarter ................ 450,000
 *   48  Non-operating income ......................... 5,000
 *   49  Total income this quarter (47+48) .......... 455,000
 *   50  Taxable income previous quarter ............ 300,000
 *   51  Cumulative (49+50) ......................... 755,000
 *   52  Allowable reduction ........................ 250,000
 *   53  Taxable to date (51−52) .................... 505,000
 *   54  TAX DUE (53 × 8%) ........................... 40,400
 *   56  Prev-quarter payment: 8% × (300,000−250,000) . 4,000
 *   58  2307 withheld this quarter ................... 2,500
 *   62  Total credits (55..61) ....................... 6,500
 *   63  Tax payable (54−62) ......................... 33,900
 *   68  Total amount payable ........................ 33,900
 *
 * Edit fixtures/dummy-1701q.json to exercise the PDF renderer without
 * changing TypeScript. Replace the fixture with Supabase-backed data later.
 */
export const DUMMY_1701Q = dummyFixture as Form1701QData;
