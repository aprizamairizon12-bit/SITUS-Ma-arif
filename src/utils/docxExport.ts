import { Document, Paragraph, TextRun, Packer, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { SchoolSetting } from '../types';

export async function exportLetterToDocx(options: {
  title: string;
  letterNumber: string;
  bodyText: string;
  signeeName: string;
  signeeNip: string;
  signeeRole: string;
  settings: SchoolSetting;
  hasKop?: boolean;
  filename?: string;
}) {
  const {
    title,
    letterNumber,
    bodyText,
    signeeName,
    signeeNip,
    signeeRole,
    settings,
    hasKop = true,
    filename = 'Surat_Resmi_SITUS.docx'
  } = options;

  const children: (Paragraph | Table)[] = [];

  // 1. Kop Surat (if enabled)
  if (hasKop) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: (settings.foundationLine1 || 'BADAN PELAKSANA PENYELENGGARA PENDIDIKAN').toUpperCase(),
            bold: true,
            size: 20,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: (settings.foundationLine2 || 'LEMBAGA PENDIDIKAN MA’ARIF NU KAMPUNG SURABAYA').toUpperCase(),
            bold: true,
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: (settings.schoolName || 'SMAS MA’ARIF 05 PADANG RATU').toUpperCase(),
            bold: true,
            size: 28, // 14pt
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Alamat : ${settings.address} Kec. Padang Ratu Kab. Lampung Tengah Kode Pos ${settings.postalCode} Provinsi Lampung`,
            size: 18,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `NSS : ${settings.nss || '30.2.12.02.12.050'}   NIS : ${settings.nisCode || '2.12.050'}   NPSN : ${settings.npsn || '10801956'}   Status : ${settings.accreditationStatus || 'Terakreditasi B'}`,
            size: 18,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `Website : ${settings.website || 'smamaarif05padangratu.sch.id'}   E-mail : ${settings.email || 'smamaarif05@gmail.com'}`,
            size: 18,
            font: 'Times New Roman',
          }),
        ],
      }),
      // Kop Divider Line
      new Paragraph({
        border: {
          bottom: {
            color: '000000',
            space: 1,
            style: BorderStyle.DOUBLE,
            size: 16,
          },
        },
        children: [],
        spacing: { after: 200 },
      })
    );
  }

  // 2. Letter Title and Number
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          underline: {},
          size: 26, // 13pt
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `Nomor: ${letterNumber}`,
          size: 22,
          font: 'Times New Roman',
        }),
      ],
    })
  );

  // 3. Body paragraphs
  // Clean raw HTML or plain text lines
  const cleanBody = bodyText
    .replace(/<[^>]*>/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  for (const line of cleanBody) {
    children.push(
      new Paragraph({
        spacing: { after: 120, line: 276 }, // 1.15 line spacing
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: line,
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  // 4. Signature Block (right aligned)
  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  children.push(
    new Paragraph({ spacing: { before: 400 }, children: [] }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [] })],
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Padang Ratu, ${today}`,
                      font: 'Times New Roman',
                      size: 22,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: signeeRole,
                      font: 'Times New Roman',
                      size: 22,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 800 }, // Space for signature / stamp
                  children: [
                    new TextRun({
                      text: signeeName,
                      bold: true,
                      underline: {},
                      font: 'Times New Roman',
                      size: 22,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `NIP. ${signeeNip}`,
                      font: 'Times New Roman',
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
