import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDict,
  PDFCheckBox,
  PDFDocument,
  PDFName,
  PDFRadioGroup,
  StandardFonts,
  PDFTextField,
  TextAlignment,
  type PDFFont,
} from "pdf-lib";

import { mapPage1, mapPage2, type PageFill } from "./field-map";
import {
  fitAddressLines,
  fitSingleLine,
  normalizeForm1701QData,
} from "./formatting";
import { flattenAcroForm } from "./flatten";
import type { Form1701QData, Render1701QOptions } from "./types";

const TEMPLATE_PATH = path.join(process.cwd(), "docs", "1701Q2018_chrome_fillable.pdf");
const ADDRESS_1 = "p1::frm1701q:j_idt66";
const ADDRESS_2 = "p1::frm1701q:taxFilerAddress2";

function getOrCreateDict(parent: PDFDict, name: string, pdfDoc: PDFDocument) {
  const key = PDFName.of(name);
  const existing = parent.lookupMaybe(key, PDFDict);
  if (existing) return existing;

  const created = pdfDoc.context.obj({}) as PDFDict;
  parent.set(key, created);
  return created;
}

function registerAcroFormEditFont(pdfDoc: PDFDocument, font: PDFFont) {
  const acroForm = pdfDoc.catalog.lookup(PDFName.of("AcroForm"), PDFDict);
  const defaultResources = getOrCreateDict(acroForm, "DR", pdfDoc);
  const fonts = getOrCreateDict(defaultResources, "Font", pdfDoc);
  fonts.set(PDFName.of(font.name), font.ref);
}

const amountFields = new Set([
  ...[
    "taxFilerTaxDue",
    "taxFilerLessTaxCredsPymts",
    "taxFilerTaxPayblOvrpymt",
    "taxFilerTotalPenalties",
    "taxFilerTotAmtPayable",
    "aggAmtPaybleOverPymt",
  ].map((id) => `p1::frm1701q:${id}`),
  ...[
    "j_idt105",
    "j_idt136",
    "j_idt140",
    "j_idt144",
    "j_idt148",
    "j_idt152",
    "j_idt159",
    "j_idt163",
    "j_idt167",
    "j_idt171",
    "j_idt175",
    "j_idt179",
    "j_idt183",
    "item62",
    "j_idt223",
    "j_idt227",
    "j_idt231",
    "j_idt235",
    "j_idt242",
    "j_idt249",
  ].map((id) => `p2::frm1701q:${id}`),
  "p2::etax:item48a",
  "p2::etax:item61a",
]);

function fieldWidth(field: PDFTextField) {
  const rectangles = field.acroField.getWidgets().map((widget) => widget.getRectangle());
  if (!rectangles.length) throw new Error(`PDF field ${field.getName()} has no widget`);
  return Math.min(...rectangles.map(({ width }) => width));
}

function setText(
  form: ReturnType<PDFDocument["getForm"]>,
  canonicalName: string,
  value: string,
  font: PDFFont,
) {
  const field = form.getTextField(canonicalName);
  const amount = amountFields.has(canonicalName);
  field.setAlignment(amount ? TextAlignment.Right : TextAlignment.Left);
  field.setFontSize(
    fitSingleLine(value, font, fieldWidth(field), {
      field: canonicalName,
      maxSize: amount ? 7 : 7,
      minSize: amount ? 5 : 4,
    }),
  );
  field.setText(value);
}

function applyPageFill(
  form: ReturnType<PDFDocument["getForm"]>,
  prefix: "p1" | "p2",
  fill: PageFill,
  font: PDFFont,
) {
  for (const [id, value] of Object.entries(fill.values)) {
    const canonicalName = `${prefix}::${id}`;
    if (canonicalName === ADDRESS_1 || canonicalName === ADDRESS_2) continue;
    setText(form, canonicalName, value, font);
  }

  for (const option of fill.checked) {
    const groupName = option.replace(/:_\d+$/, "");
    const field = form.getField(`${prefix}::${groupName}`);
    if (field instanceof PDFRadioGroup) {
      field.select(option);
    } else if (field instanceof PDFCheckBox) {
      field.check();
    } else {
      throw new Error(`${field.getName()} is not a radio group or checkbox`);
    }
  }
}

function applyAddress(
  form: ReturnType<PDFDocument["getForm"]>,
  data: Form1701QData,
  font: PDFFont,
) {
  const first = form.getTextField(ADDRESS_1);
  const second = form.getTextField(ADDRESS_2);
  const fitted = fitAddressLines(
    data.identity.registeredAddress,
    data.identity.registeredAddressLine2,
    font,
    [fieldWidth(first) - 3, fieldWidth(second) - 3],
  );
  first.setFontSize(fitted.size);
  first.setText(fitted.lines[0]);
  second.setFontSize(fitted.size);
  second.setText(fitted.lines[1]);
}

export async function render1701Q(
  input: Form1701QData,
  options: Render1701QOptions = {},
): Promise<Uint8Array> {
  const data = normalizeForm1701QData(input);
  const templateBytes = await readFile(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const form = pdfDoc.getForm();

  applyPageFill(form, "p1", mapPage1(data), font);
  applyPageFill(form, "p2", mapPage2(data), font);
  applyAddress(form, data, font);
  form.updateFieldAppearances(font);
  registerAcroFormEditFont(pdfDoc, font);

  if (options.flatten === true) flattenAcroForm(pdfDoc);
  return pdfDoc.save();
}
