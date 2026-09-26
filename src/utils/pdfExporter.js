import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

export async function exportSalesReportPDF(
  storeName = 'Store',
  sales = [],
  totalRevenue = 0,
  totalProfit = 0,
  filterLabel = 'REPORT'
) {
  try {
    // ---------------------------------------
    // HTML ESCAPE
    // ---------------------------------------
    const escapeHtml = (value) => {
      if (value === null || value === undefined) {
        return '';
      }

      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    // ---------------------------------------
    // SAFE VALUES
    // ---------------------------------------
    const safeStoreName = escapeHtml(storeName);
    const safeFilterLabel = escapeHtml(filterLabel);

    const revenue = Number(totalRevenue) || 0;
    const profit = Number(totalProfit) || 0;

    // ---------------------------------------
    // SALES TABLE
    // ---------------------------------------
    const tableRows = sales
      .map((s) => {
        const transactionId = s?.id
          ? String(s.id).slice(-6)
          : '------';

        const createdAt = s?.createdAt || '';

        const paymentType = String(
          s?.paymentType || 'CASH'
        ).toUpperCase();

        const paymentColor =
          paymentType === 'DEBT'
            ? '#ef4444'
            : '#0284c7';

        const items = Array.isArray(s?.items)
          ? s.items
              .map((item) => {
                const quantity =
                  Number(item?.quantity) || 0;

                const name = escapeHtml(
                  item?.name || 'Item'
                );

                return `${quantity}x ${name}`;
              })
              .join('<br/>')
          : '';

        const amount =
          Number(s?.totalAmount) || 0;

        const itemProfit =
          Number(s?.totalProfit) || 0;

        return `
          <tr>
            <td>
              #${escapeHtml(transactionId)}
            </td>

            <td>
              ${escapeHtml(createdAt)}
            </td>

            <td
              style="
                font-weight: bold;
                color: ${paymentColor};
              "
            >
              ${escapeHtml(paymentType)}
            </td>

            <td>
              ${items || '-'}
            </td>

            <td
              style="
                text-align: right;
                font-weight: bold;
              "
            >
              ₱${amount.toFixed(2)}
            </td>

            <td
              style="
                text-align: right;
                color: #16a34a;
                font-weight: bold;
              "
            >
              +₱${itemProfit.toFixed(2)}
            </td>
          </tr>
        `;
      })
      .join('');

    // ---------------------------------------
    // DATE
    // ---------------------------------------
    const generatedDate =
      new Date().toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

    // ---------------------------------------
    // HTML
    // ---------------------------------------
    const htmlContent = `
      <!DOCTYPE html>

      <html>

        <head>

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />

          <style>

            * {
              box-sizing: border-box;
            }

            body {
              font-family:
                'Helvetica Neue',
                Helvetica,
                Arial,
                sans-serif;

              padding: 24px;
              color: #1e293b;
              background: #ffffff;
            }

            .header-bar {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 18px;
            }

            h1 {
              font-size: 22px;
              margin: 0 0 4px 0;
              color: #0f172a;
            }

            .subtitle {
              font-size: 12px;
              color: #64748b;
              margin: 0;
            }

            .kpi-row {
              display: flex;
              gap: 12px;
              margin-bottom: 20px;
            }

            .kpi-card {
              flex: 1;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 12px;
              background: #f8fafc;
            }

            .kpi-title {
              font-size: 9px;
              font-weight: bold;
              color: #64748b;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              margin-bottom: 4px;
            }

            .kpi-val {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              margin-top: 8px;
            }

            th {
              background-color: #0f172a;
              color: white;
              padding: 8px 10px;
              text-align: left;
            }

            td {
              border-bottom: 1px solid #e2e8f0;
              padding: 8px 10px;
              vertical-align: top;
            }

            tr:nth-child(even) {
              background-color: #f8fafc;
            }

            .footer {
              margin-top: 32px;
              font-size: 11px;
              text-align: center;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
            }

          </style>

        </head>

        <body>

          <div class="header-bar">

            <h1>
              ${safeStoreName}
            </h1>

            <p class="subtitle">
              Sales Summary (${safeFilterLabel})
              &bull;
              Generated on ${generatedDate}
            </p>

          </div>

          <div class="kpi-row">

            <div class="kpi-card">

              <div class="kpi-title">
                Transactions
              </div>

              <div class="kpi-val">
                ${sales.length}
              </div>

            </div>

            <div class="kpi-card">

              <div class="kpi-title">
                Total Revenue
              </div>

              <div class="kpi-val">
                ₱${revenue.toFixed(2)}
              </div>

            </div>

            <div class="kpi-card">

              <div class="kpi-title">
                Net Profit
              </div>

              <div
                class="kpi-val"
                style="color: #16a34a;"
              >
                ₱${profit.toFixed(2)}
              </div>

            </div>

          </div>

          <table>

            <thead>

              <tr>

                <th>
                  TRX
                </th>

                <th>
                  Date &amp; Time
                </th>

                <th>
                  Type
                </th>

                <th>
                  Purchased Items
                </th>

                <th
                  style="text-align: right;"
                >
                  Amount
                </th>

                <th
                  style="text-align: right;"
                >
                  Profit
                </th>

              </tr>

            </thead>

            <tbody>

              ${
                tableRows ||
                `
                  <tr>

                    <td
                      colspan="6"
                      style="
                        text-align: center;
                        padding: 18px;
                        color: #94a3b8;
                      "
                    >
                      No transactions found
                      for this period.
                    </td>

                  </tr>
                `
              }

            </tbody>

          </table>

          <div class="footer">

            Generated via TindahanPOS
            &bull;
            Retail Point-of-Sale System

          </div>

        </body>

      </html>
    `;

    // ---------------------------------------
    // GENERATE PDF + BASE64
    // ---------------------------------------
    const result = await Print.printToFileAsync({
      html: htmlContent,
      base64: true,
    });

    // ---------------------------------------
    // CHECK BASE64
    // ---------------------------------------
    if (!result.base64) {
      throw new Error(
        'PDF was generated, but the PDF data was not returned.'
      );
    }

    // ---------------------------------------
    // CREATE OUR OWN PDF FILE
    // ---------------------------------------
    const fileName =
      `Sales_Report_${Date.now()}.pdf`;

    const destination =
      `${FileSystem.documentDirectory}${fileName}`;

    // Write the Base64 PDF directly.
    // This avoids trying to read the Expo Print
    // cache URI.
    await FileSystem.writeAsStringAsync(
      destination,
      result.base64,
      {
        encoding: FileSystem.EncodingType.Base64,
      }
    );

    // ---------------------------------------
    // VERIFY FILE
    // ---------------------------------------
    const fileInfo =
      await FileSystem.getInfoAsync(destination);

    if (!fileInfo.exists) {
      throw new Error(
        'PDF file was not created successfully.'
      );
    }

    // ---------------------------------------
    // SHARE
    // ---------------------------------------
    const sharingAvailable =
      await Sharing.isAvailableAsync();

    if (!sharingAvailable) {
      Alert.alert(
        'PDF Created',
        `The report was created successfully.\n\n${destination}`
      );

      return;
    }

    await Sharing.shareAsync(
      destination,
      {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Share Sales Report',
      }
    );

  } catch (error) {

    console.error(
      'Sales PDF Export Error:',
      error
    );

    Alert.alert(
      'Export Failed',
      error?.message ||
        'Unable to generate PDF report.'
    );
  }
}