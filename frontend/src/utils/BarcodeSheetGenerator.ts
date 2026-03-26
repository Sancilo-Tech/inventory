interface Item {
  itemId: string;
  itemCode: string;
  itemName: string;
  barcode?: string;
}

interface BarcodeSheetGeneratorProps {
  item: Item;
  count: number;
}

export const generateBarcodeSheet = ({ item, count }: BarcodeSheetGeneratorProps) => {
  if (!item || !item.barcode || count <= 0) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  let html = `
    <html>
      <head>
        <title>Barcode Sheet - ${item.itemName}-(${item.itemCode})</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 10; padding: 100mm; font-family: Arial, sans-serif; }
          .barcode-grid { display: grid; grid-template-columns: repeat(4, 1fr); column-gap: 800px; row-gap: 800px; }
          .barcode-row { display: contents; }
          .barcode-item { text-align: center; border: 1px dashed #ccc; padding: 80px 20px; page-break-inside: avoid; break-inside: avoid; }
          .barcode-item canvas { margin: 10px 0; }
          .item-info { font-size: 11px; margin-top: 10px; }
          .row-group { display: grid; grid-template-columns: repeat(4, 1fr); column-gap: 16px; page-break-inside: avoid; break-inside: avoid; }
          .row-spacer { height: 200px; }
          @media print {
            body { margin: 0; padding: 10mm; }
            .row-group { page-break-inside: avoid; break-inside: avoid; }
            .row-spacer { height: 200px; }
            .row-group:nth-child(8n) { page-break-after: always; }
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <div id="sheet">
  `;

  for (let i = 0; i < count; i++) {
    if (i % 4 === 0) {
      if (i !== 0) html += `</div><div class="row-spacer"></div>`;
      html += `<div class="row-group">`;
    }
    html += `
      <div class="barcode-item">
        <canvas id="barcode${i}"></canvas>
        <div class="item-info">
          <div>${item.itemName}</div><div>${item.itemCode}</div>
        </div>
      </div>
    `;
  }

  html += `
        </div></div>
        <script>
          window.onload = function() {
            for (let i = 0; i < ${count}; i++) {
              JsBarcode("#barcode" + i, "${item.barcode}", {
                width: 1,
                height: 80,
                padding: 100,
                fontSize: 10,
                textMargin: 10
              });
            }
            setTimeout(() => window.print(), 500);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};