import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Job } from '@/types';
import { PROCESS_LABEL } from '@/constants';

function rowsHtml(jobs: Job[]): string {
  return jobs
    .map(
      (j) => `
        <tr>
          <td>${j.date}</td>
          <td>${PROCESS_LABEL[j.process]}</td>
          <td>${j.address}</td>
          <td style="text-align:right">${j.amount.toLocaleString()}원</td>
          <td style="text-align:center">${j.status === 'paid' ? '수금' : '미수금'}</td>
        </tr>`,
    )
    .join('');
}

export async function shareInvoicePdf(args: {
  factoryName: string;
  driverName: string;
  jobs: Job[];
}): Promise<void> {
  const { factoryName, driverName, jobs } = args;
  const total = jobs.reduce((s, j) => s + j.amount, 0);
  const unpaid = jobs.filter((j) => j.status !== 'paid').reduce((s, j) => s + j.amount, 0);
  const issuedAt = new Date().toISOString().slice(0, 10);

  const html = `
    <html><head><meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, sans-serif; padding: 24px; color: #111; }
      h1 { font-size: 24px; margin-bottom: 4px; }
      .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border-bottom: 1px solid #eee; padding: 6px 4px; }
      th { background: #f7f8fa; text-align: left; }
      .totals { margin-top: 16px; font-size: 14px; }
      .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
      .totals .grand { font-weight: 700; font-size: 16px; border-top: 1px solid #ccc; padding-top: 8px; margin-top: 8px; }
    </style></head>
    <body>
      <h1>청구서</h1>
      <div class="meta">발행일: ${issuedAt} · 발행자: ${driverName} · 청구처: ${factoryName}</div>
      <table>
        <thead><tr><th>날짜</th><th>공정</th><th>주소</th><th style="text-align:right">금액</th><th>상태</th></tr></thead>
        <tbody>${rowsHtml(jobs)}</tbody>
      </table>
      <div class="totals">
        <div class="row"><span>총 시공 ${jobs.length}건</span><span>${total.toLocaleString()}원</span></div>
        <div class="row grand"><span>미수금</span><span>${unpaid.toLocaleString()}원</span></div>
      </div>
    </body></html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${factoryName} 청구서` });
  }
}
