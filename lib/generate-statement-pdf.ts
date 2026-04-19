/**
 * generate-statement-pdf.ts
 *
 * Generates a Crestmont Bank account statement PDF as a Blob.
 * Uses pdf-lib (browser-safe, no Node.js required).
 *
 * Install: npm install pdf-lib
 */

import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib"

type Transaction = {
  id: string
  type: "credit" | "debit"
  description: string
  amount: number
  currency: string
  status: string
  reference?: string | null
  created_at: string
}

type Account = {
  account_number?: string
  iban?: string
  currency?: string
  balance?: number
  name?: string
} | null

type StatementInput = {
  clientName: string
  email: string
  period: string // "YYYY-MM"
  account: Account
  transactions: Transaction[]
}

// Color palette
const COLOR = {
  navy: rgb(0.04, 0.11, 0.25),
  gold: rgb(0.72, 0.58, 0.28),
  lightGray: rgb(0.94, 0.94, 0.95),
  midGray: rgb(0.55, 0.55, 0.6),
  black: rgb(0.1, 0.1, 0.1),
  white: rgb(1, 1, 1),
  green: rgb(0.13, 0.55, 0.36),
  red: rgb(0.75, 0.18, 0.18),
}

function formatCurrency(amount: number, currency = "CHF") {
  return new Intl.NumberFormat("en-CH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function periodLabel(period: string) {
  const [year, month] = period.split("-")
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString("en-CH", { month: "long", year: "numeric" })
}

export async function generateStatementPDF(input: StatementInput): Promise<Blob> {
  const { clientName, email, period, account, transactions } = input

  const pdfDoc = await PDFDocument.create()

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const PAGE_W = 595 // A4 width pts
  const PAGE_H = 842 // A4 height pts
  const MARGIN = 48
  const CONTENT_W = PAGE_W - MARGIN * 2

  // ─── Helper: add a new page ─────────────────────────────────────────────────
  function addPage(): { page: PDFPage; y: () => number; setY: (v: number) => void } {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H])
    let _y = PAGE_H - MARGIN

    // Header bar
    page.drawRectangle({
      x: 0, y: PAGE_H - 56, width: PAGE_W, height: 56,
      color: COLOR.navy,
    })
    page.drawText("CRESTMONT BANK", {
      x: MARGIN, y: PAGE_H - 36,
      size: 14, font: fontBold, color: COLOR.white,
    })
    page.drawText("PRIVATE BANKING", {
      x: MARGIN, y: PAGE_H - 50,
      size: 7, font: fontRegular, color: COLOR.gold,
    })

    // Gold accent line below header
    page.drawRectangle({
      x: 0, y: PAGE_H - 58, width: PAGE_W, height: 2,
      color: COLOR.gold,
    })

    _y = PAGE_H - 80

    // Footer
    page.drawLine({
      start: { x: MARGIN, y: 36 }, end: { x: PAGE_W - MARGIN, y: 36 },
      thickness: 0.5, color: COLOR.midGray,
    })
    page.drawText("Crestmont Bank SA · Bahnhofstrasse 12 · 8001 Zürich · Switzerland", {
      x: MARGIN, y: 22, size: 7, font: fontRegular, color: COLOR.midGray,
    })
    page.drawText(`Generated ${new Date().toLocaleDateString("en-CH")}`, {
      x: PAGE_W - MARGIN - 80, y: 22, size: 7, font: fontRegular, color: COLOR.midGray,
    })

    return {
      page,
      y: () => _y,
      setY: (v: number) => { _y = v },
    }
  }

  // ─── Page 1 ──────────────────────────────────────────────────────────────────
  let { page, y, setY } = addPage()

  // Statement title section
  page.drawText("ACCOUNT STATEMENT", {
    x: MARGIN, y: y(),
    size: 18, font: fontBold, color: COLOR.navy,
  })
  setY(y() - 18)
  page.drawText(periodLabel(period), {
    x: MARGIN, y: y(),
    size: 11, font: fontRegular, color: COLOR.gold,
  })
  setY(y() - 28)

  // Divider
  page.drawRectangle({ x: MARGIN, y: y(), width: CONTENT_W, height: 1, color: COLOR.lightGray })
  setY(y() - 20)

  // Client info block
  const colLeft = MARGIN
  const colRight = MARGIN + CONTENT_W / 2

  function label(text: string, px: number, py: number) {
    page.drawText(text, { x: px, y: py, size: 7, font: fontRegular, color: COLOR.midGray })
  }
  function value(text: string, px: number, py: number) {
    page.drawText(text, { x: px, y: py, size: 10, font: fontBold, color: COLOR.black })
  }

  label("CLIENT NAME", colLeft, y())
  label("EMAIL", colRight, y())
  setY(y() - 13)
  value(clientName, colLeft, y())
  value(email || "—", colRight, y())
  setY(y() - 22)

  label("ACCOUNT NAME", colLeft, y())
  label("ACCOUNT NUMBER", colRight, y())
  setY(y() - 13)
  value(account?.name ?? "—", colLeft, y())
  value(account?.account_number ?? "—", colRight, y())
  setY(y() - 22)

  if (account?.iban) {
    label("IBAN", colLeft, y())
    label("CURRENCY", colRight, y())
    setY(y() - 13)
    value(account.iban, colLeft, y())
    value(account?.currency ?? "CHF", colRight, y())
    setY(y() - 22)
  }

  setY(y() - 8)

  // Closing balance banner
  page.drawRectangle({ x: MARGIN, y: y() - 36, width: CONTENT_W, height: 46, color: COLOR.navy })
  page.drawText("CLOSING BALANCE", {
    x: MARGIN + 16, y: y() - 14,
    size: 7, font: fontRegular, color: COLOR.gold,
  })
  page.drawText(
    formatCurrency(account?.balance ?? 0, account?.currency ?? "CHF"),
    { x: MARGIN + 16, y: y() - 30, size: 18, font: fontBold, color: COLOR.white }
  )
  setY(y() - 52)

  setY(y() - 20)

  // ─── Transactions table ───────────────────────────────────────────────────
  // Column widths
  const COL = {
    date: { x: MARGIN, w: 68 },
    desc: { x: MARGIN + 68, w: 200 },
    ref: { x: MARGIN + 268, w: 100 },
    amount: { x: MARGIN + 368, w: 80 },
    status: { x: MARGIN + 448, w: 55 },
  }

  function drawTableHeader(p: PDFPage, headerY: number) {
    p.drawRectangle({ x: MARGIN, y: headerY - 4, width: CONTENT_W, height: 18, color: COLOR.navy })
    const headers = [
      ["DATE", COL.date.x + 4],
      ["DESCRIPTION", COL.desc.x + 4],
      ["REFERENCE", COL.ref.x + 4],
      ["AMOUNT", COL.amount.x + 4],
      ["STATUS", COL.status.x + 4],
    ] as [string, number][]
    headers.forEach(([h, hx]) => {
      p.drawText(h, { x: hx, y: headerY + 2, size: 7, font: fontBold, color: COLOR.white })
    })
    return headerY - 22
  }

  // Section heading
  page.drawText("TRANSACTIONS", {
    x: MARGIN, y: y(),
    size: 10, font: fontBold, color: COLOR.navy,
  })
  setY(y() - 16)

  setY(drawTableHeader(page, y()))

  if (transactions.length === 0) {
    page.drawText("No transactions found for this period.", {
      x: MARGIN + 4, y: y() - 12,
      size: 9, font: fontRegular, color: COLOR.midGray,
    })
  } else {
    let rowIndex = 0
    for (const tx of transactions) {
      // New page if running out of space
      if (y() < 80) {
        const next = addPage()
        page = next.page
        setY(next.y())
        // Re-assign local closures for new page
        const newY = next.y
        setY = next.setY
        setY(drawTableHeader(page, y()))
      }

      const rowY = y()
      // Alternating row bg
      if (rowIndex % 2 === 1) {
        page.drawRectangle({
          x: MARGIN, y: rowY - 4, width: CONTENT_W, height: 16,
          color: COLOR.lightGray,
        })
      }

      const textY = rowY + 1

      page.drawText(formatDate(tx.created_at), {
        x: COL.date.x + 4, y: textY, size: 8, font: fontRegular, color: COLOR.black,
      })

      // Truncate long descriptions
      const desc = tx.description.length > 32
        ? tx.description.substring(0, 30) + "…"
        : tx.description
      page.drawText(desc, {
        x: COL.desc.x + 4, y: textY, size: 8, font: fontRegular, color: COLOR.black,
      })

      page.drawText(tx.reference?.substring(0, 14) ?? "—", {
        x: COL.ref.x + 4, y: textY, size: 8, font: fontRegular, color: COLOR.midGray,
      })

      const amtColor = tx.type === "credit" ? COLOR.green : COLOR.red
      const amtText = `${tx.type === "credit" ? "+" : "-"}${formatCurrency(tx.amount, tx.currency)}`
      page.drawText(amtText, {
        x: COL.amount.x + 4, y: textY, size: 8, font: fontBold, color: amtColor,
      })

      page.drawText(tx.status, {
        x: COL.status.x + 4, y: textY, size: 7, font: fontRegular, color: COLOR.midGray,
      })

      setY(y() - 18)
      rowIndex++
    }
  }

  // ─── Summary row at bottom ───────────────────────────────────────────────
  setY(y() - 10)
  const credits = transactions
    .filter((t) => t.type === "credit" && t.status === "completed")
    .reduce((s, t) => s + t.amount, 0)
  const debits = transactions
    .filter((t) => t.type === "debit" && t.status === "completed")
    .reduce((s, t) => s + t.amount, 0)

  page.drawRectangle({ x: MARGIN, y: y() - 4, width: CONTENT_W, height: 26, color: COLOR.lightGray })
  page.drawText(`Total Credits: ${formatCurrency(credits, account?.currency ?? "CHF")}`, {
    x: MARGIN + 8, y: y() + 6, size: 8, font: fontBold, color: COLOR.green,
  })
  page.drawText(`Total Debits: ${formatCurrency(debits, account?.currency ?? "CHF")}`, {
    x: MARGIN + 180, y: y() + 6, size: 8, font: fontBold, color: COLOR.red,
  })
  page.drawText(`Transactions: ${transactions.length}`, {
    x: MARGIN + 360, y: y() + 6, size: 8, font: fontBold, color: COLOR.navy,
  })

  // ─── Serialize ───────────────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: "application/pdf" })
}