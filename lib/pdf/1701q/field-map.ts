import type { Form1701QData } from "./types";
import { formatPesos } from "./formatting";

/**
 * Maps Form1701QData onto the input ids of the eFPS 1701Q templates
 * (lib/pdf/1701q/templates/). Ids are the original eFPS ones, except the
 * `etax:*` ids we introduced for the dynamic "specify" rows (see templates/README.md).
 *
 * Money is rendered in whole pesos with thousands separators — the form
 * forbids centavos ("49 Centavos or Less drop down; 50 or more round up").
 */

export { formatPesos } from "./formatting";

export type PageFill = {
  /** input id -> value attribute to set (text inputs) */
  values: Record<string, string>;
  /** ids of radio/checkbox inputs to mark checked */
  checked: string[];
};

export function mapPage1(data: Form1701QData): PageFill {
  const { identity, scheduleII, scheduleIII } = data;
  const tin = identity.tin;

  const values: Record<string, string> = {
    "frm1701q:j_idt31": data.year,
    "frm1701q:noOfSheets": "0",
    // TIN: three 3-digit groups + branch code
    "frm1701q:j_idt41": tin.slice(0, 3),
    "frm1701q:j_idt43": tin.slice(3, 6),
    "frm1701q:j_idt45": tin.slice(6, 9),
    "frm1701q:taxFilerBranchCode": "000",
    "frm1701q:j_idt48": identity.rdoCode,
    "frm1701q:j_idt64": identity.registeredName,
    "frm1701q:j_idt66": identity.registeredAddress,
    "frm1701q:taxFilerAddress2": identity.registeredAddressLine2 ?? "",
    "frm1701q:zipCode": identity.zipCode,
    "frm1701q:j_idt70": identity.dateOfBirth,
    "frm1701q:j_idt72": identity.email,
    "frm1701q:j_idt74": identity.citizenship,
    // Part III, column A
    "frm1701q:taxFilerTaxDue": formatPesos(scheduleII.taxDue),
    "frm1701q:taxFilerLessTaxCredsPymts": formatPesos(scheduleIII.totalTaxCreditsPayments),
    "frm1701q:taxFilerTaxPayblOvrpymt": formatPesos(data.taxPayable),
    "frm1701q:taxFilerTotalPenalties": formatPesos(0),
    "frm1701q:taxFilerTotAmtPayable": formatPesos(data.totalAmountPayable),
    "frm1701q:aggAmtPaybleOverPymt": formatPesos(data.totalAmountPayable),
  };

  const quarterRadio = { 1: "_1", 2: "_2", 3: "_3" }[data.quarter];
  const atcRadio = identity.atc === "II015" ? "_4" : "_5"; // j_idt56: _4=II015, _5=II017
  const typeRadio = identity.taxpayerType === "single_proprietor" ? "_1" : "_2";

  const checked = [
    `frm1701q:optQtr:${quarterRadio}`,
    `frm1701q:amendedYn:${data.amendedReturn ? "_1" : "_2"}`,
    `frm1701q:j_idt50:${typeRadio}`,
    `frm1701q:j_idt56:${atcRadio}`,
    `frm1701q:j_idt78:${identity.claimingForeignTaxCredits ? "_1" : "_2"}`,
    "frm1701q:j_idt82:_2", // item 16 tax rate: E = 8% option
  ];

  return { values, checked };
}

export function mapPage2(data: Form1701QData): PageFill {
  const { identity, scheduleII: s2, scheduleIII: s3 } = data;
  const tin = identity.tin;
  const lastName = identity.registeredName.split(",")[0]?.trim() ?? "";

  const values: Record<string, string> = {
    "frm1701q:taxFilerTinPart1": tin.slice(0, 3),
    "frm1701q:taxFilerTinPart2": tin.slice(3, 6),
    "frm1701q:taxFilerTinPart3": tin.slice(6, 9),
    "frm1701q:taxFilerBranchCode": "000",
    "frm1701q:taxFilerLastName": lastName,
    // Schedule II — 8% IT rate, column A
    "frm1701q:j_idt105": formatPesos(s2.salesRevenuesReceiptsFees),
    "etax:item48a": formatPesos(s2.nonOperatingIncome),
    "frm1701q:j_idt136": formatPesos(s2.totalIncomeThisQuarter),
    "frm1701q:j_idt140": formatPesos(s2.taxableIncomePreviousQuarters),
    "frm1701q:j_idt144": formatPesos(s2.cumulativeTaxableIncome),
    "frm1701q:j_idt148": formatPesos(s2.allowableReduction),
    "frm1701q:j_idt152": formatPesos(s2.taxableIncomeToDate),
    "frm1701q:j_idt159": formatPesos(s2.taxDue),
    // Schedule III — credits/payments, column A
    "frm1701q:j_idt163": formatPesos(s3.priorYearsExcessCredits),
    "frm1701q:j_idt167": formatPesos(s3.taxPaymentsPreviousQuarters),
    "frm1701q:j_idt171": formatPesos(s3.creditableTaxWithheldPreviousQuarters),
    "frm1701q:j_idt175": formatPesos(s3.creditableTaxWithheld2307ThisQuarter),
    "frm1701q:j_idt179": formatPesos(s3.taxPaidReturnPreviouslyFiled),
    "frm1701q:j_idt183": formatPesos(s3.foreignTaxCredits),
    "etax:item61a": formatPesos(s3.otherTaxCreditsPayments),
    "frm1701q:item62": formatPesos(s3.totalTaxCreditsPayments),
    // Totals + penalties, column A
    "frm1701q:j_idt223": formatPesos(data.taxPayable),
    "frm1701q:j_idt227": formatPesos(0), // 64 surcharge
    "frm1701q:j_idt231": formatPesos(0), // 65 interest
    "frm1701q:j_idt235": formatPesos(0), // 66 compromise
    "frm1701q:j_idt242": formatPesos(0), // 67 total penalties
    "frm1701q:j_idt249": formatPesos(data.totalAmountPayable),
  };

  return { values, checked: [] };
}
