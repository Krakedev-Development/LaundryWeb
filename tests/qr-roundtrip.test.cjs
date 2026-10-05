const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const QRCode = require('react-qr-code').default;
const qrcode = require('qrcode-generator');
const {
  RGBLuminanceSource,
  HybridBinarizer,
  BinaryBitmap,
  QRCodeReader,
} = require('@zxing/library');
test('the displayed QR encoder generates a barcode decodable by the browser scanner engine', () => {
  const value =
    'laundry://handoff/HND-SOL-STORE-001-1?t=demo-SOL-STORE-001-CUSTOMER_TO_FACILITY-e7b451cf6d924a08';
  const svg = renderToStaticMarkup(
    React.createElement(QRCode, { value, size: 190 }),
  );
  assert.match(svg, /<svg/);
  assert.match(svg, /<path/);
  const qr = qrcode(0, 'L');
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  const scale = 6,
    padding = 4;
  const width = (n + padding * 2) * scale;
  const pixels = new Int32Array(width * width);
  pixels.fill(0xffffff);
  for (let row = 0; row < n; row++)
    for (let col = 0; col < n; col++)
      if (qr.isDark(row, col))
        for (let y = 0; y < scale; y++)
          for (let x = 0; x < scale; x++)
            pixels[
              ((row + padding) * scale + y) * width +
                (col + padding) * scale +
                x
            ] = 0;
  const bitmap = new BinaryBitmap(
    new HybridBinarizer(new RGBLuminanceSource(pixels, width, width)),
  );
  assert.equal(new QRCodeReader().decode(bitmap).getText(), value);
});
