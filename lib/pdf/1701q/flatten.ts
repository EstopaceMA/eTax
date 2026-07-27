import {
  PDFDocument,
  PDFDict,
  PDFName,
  PDFRef,
  type PDFField,
  type PDFPage,
} from "pdf-lib";

type WidgetInternals = {
  dict: PDFDict;
};

type AcroFieldInternals = {
  getWidgets(): WidgetInternals[];
  normalizedEntries(): { Kids: { get(index: number): unknown; size(): number } };
};

type FieldInternals = {
  acroField: AcroFieldInternals;
  ref: PDFRef;
  getName(): string;
};

type FormInternals = {
  acroForm: { removeField(field: AcroFieldInternals): void };
  findWidgetPage(widget: WidgetInternals): PDFPage;
  removeField(field: PDFField): void;
  flatten(options: { updateFieldAppearances: boolean }): void;
};

export function flattenAcroForm(pdfDoc: PDFDocument) {
  const form = pdfDoc.getForm() as unknown as FormInternals;

  form.removeField = (publicField: PDFField) => {
    const field = publicField as unknown as FieldInternals;
    const pages = new Set<PDFPage>();
    for (const widget of field.acroField.getWidgets()) {
      const page = form.findWidgetPage(widget);
      const widgetRef = pdfDoc.context.getObjectRef(widget.dict);
      if (!widgetRef) throw new Error(`Missing widget reference for ${field.getName()}`);
      pages.add(page);
      page.node.removeAnnot(widgetRef);
    }

    pages.forEach((page) => page.node.removeAnnot(field.ref));
    form.acroForm.removeField(field.acroField);
    const kids = field.acroField.normalizedEntries().Kids;
    for (let index = 0; index < kids.size(); index += 1) {
      const child = kids.get(index);
      if (child instanceof PDFRef) pdfDoc.context.delete(child);
    }
    pdfDoc.context.delete(field.ref);
  };

  form.flatten({ updateFieldAppearances: false });
  pdfDoc.catalog.delete(PDFName.of("AcroForm"));
}
