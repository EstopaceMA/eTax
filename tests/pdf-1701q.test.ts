import assert from "node:assert/strict";
import test from "node:test";
import { PDFDict, PDFDocument, PDFName } from "pdf-lib";

import { DUMMY_1701Q } from "../lib/pdf/1701q/dummy-data";
import {
  Form1701QValidationError,
  formatPesos,
  normalizeForm1701QData,
} from "../lib/pdf/1701q/formatting";
import { render1701Q } from "../lib/pdf/1701q/render";

test("identity formats are normalized without truncating legal text", () => {
  const normalized = normalizeForm1701QData({
    ...DUMMY_1701Q,
    identity: {
      ...DUMMY_1701Q.identity,
      tin: "123-456-789",
      registeredName: "de la peña, josé",
      dateOfBirth: "1990-01-15",
      rdoCode: "43a",
    },
  });

  assert.equal(normalized.identity.tin, "123456789");
  assert.equal(normalized.identity.registeredName, "DE LA PEÑA, JOSÉ");
  assert.equal(normalized.identity.dateOfBirth, "01/15/1990");
  assert.equal(normalized.identity.rdoCode, "43A");
});

test("amounts round to whole pesos and preserve negative values", () => {
  const normalized = normalizeForm1701QData({
    ...DUMMY_1701Q,
    taxPayable: -1234.5,
    totalAmountPayable: 1234.49,
  });

  assert.equal(normalized.taxPayable, -1235);
  assert.equal(normalized.totalAmountPayable, 1234);
  assert.equal(formatPesos(normalized.taxPayable), "-1,235");
});

test("invalid identifiers and dates produce explicit field errors", () => {
  assert.throws(
    () =>
      normalizeForm1701QData({
        ...DUMMY_1701Q,
        identity: {
          ...DUMMY_1701Q.identity,
          tin: "ABC",
          zipCode: "12",
          rdoCode: "EAST PASIG",
          dateOfBirth: "02/30/1990",
        },
      }),
    (error) =>
      error instanceof Form1701QValidationError &&
      error.issues.some(({ field }) => field === "identity.tin") &&
      error.issues.some(({ field }) => field === "identity.zipCode") &&
      error.issues.some(({ field }) => field === "identity.rdoCode") &&
      error.issues.some(({ field }) => field === "identity.dateOfBirth"),
  );
});

test("editable output is the default and preserves Unicode values", async () => {
  const bytes = await render1701Q({
    ...DUMMY_1701Q,
    identity: {
      ...DUMMY_1701Q.identity,
      registeredName: "DE LA PEÑA, JOSÉ",
      registeredAddress:
        "UNIT 1201, MAHABANG PANGALAN RESIDENCES, 123 KALAYAAN AVENUE",
      registeredAddressLine2: "BARANGAY SAN ANTONIO, PASIG CITY",
    },
  });
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();
  const acroForm = pdf.catalog.lookup(PDFName.of("AcroForm"), PDFDict);
  const defaultResources = acroForm.lookup(PDFName.of("DR"), PDFDict);
  const fonts = defaultResources.lookup(PDFName.of("Font"), PDFDict);

  assert.equal(form.getFields().length, 135);
  assert.equal(fonts.has(PDFName.of("Helvetica")), true);
  assert.equal(form.getTextField("p1::frm1701q:j_idt64").getText(), "DE LA PEÑA, JOSÉ");
  assert.equal(
    form.getTextField("p1::frm1701q:taxFilerAddress2").getText(),
    "BARANGAY SAN ANTONIO, PASIG CITY",
  );
});

test("values that cannot fit fail instead of being clipped", async () => {
  await assert.rejects(
    render1701Q({
      ...DUMMY_1701Q,
      identity: {
        ...DUMMY_1701Q.identity,
        registeredName: `DELA CRUZ, ${"EXTREMELYLONGLEGALNAME".repeat(30)}`,
      },
    }),
    (error) =>
      error instanceof Form1701QValidationError &&
      error.issues.some(({ field }) => field === "p1::frm1701q:j_idt64"),
  );
});

test("flattening is explicit, vector-preserving, and removes the AcroForm", async () => {
  const bytes = await render1701Q(DUMMY_1701Q, { flatten: true });
  const pdf = await PDFDocument.load(bytes);

  assert.equal(pdf.catalog.has(PDFName.of("AcroForm")), false);
  assert.equal(pdf.getPages().length, 2);
  assert.ok(bytes.length < 1_000_000);
});
