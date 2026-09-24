import * as XLSX from 'xlsx'
import {
  Document, Packer, Paragraph, Table, TableRow,
  TableCell, TextRun, WidthType, AlignmentType,
  ShadingType
} from 'docx'
import { saveAs } from 'file-saver'

interface ProspectExport {
  enterprise_id:        string
  name:                 string
  email:                string | null
  phone:                string | null
  package_type:         string | null
  template_title:       string | null
  template_preview_url: string | null
  budget:               number | null
  budget_source:        string | null
  prospect_status:      string | null
  rappel_at:            string | null
  region:               string | null
  sector:               string | null
  internal_notes:       string | null
  message:              string | null
  created_at:           string
}

const HEADERS = [
  'NOM',
  'EMAIL',
  'TÉLÉPHONE',
  'PLAN',
  'TEMPLATE',
  'LIEN PREVIEW',
  'BUDGET (FCFA)',
  'STATUT',
  'DATE RAPPEL',
  'RÉGION',
  'SECTEUR',
  'MESSAGE CLIENT',
  'COMMENTAIRE',
  'DATE INSCRIPTION'
]

function formatBudget(val: number | null): string {
  if (!val || val === 0) return ''
  // Format sans séparateur de milliers problématique
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function buildRows(prospects: ProspectExport[]): string[][] {
  return prospects.map(p => [
    p.name                  ?? '',
    p.email                 ?? '',
    p.phone                 ?? '',
    p.package_type          ?? '',
    p.template_title        ?? '',
    p.template_preview_url  ?? '',
    formatBudget(p.budget),
    p.prospect_status       ?? '',
    p.rappel_at
      ? new Date(p.rappel_at).toLocaleDateString('fr-FR')
      : '',
    p.region                ?? '',
    p.sector                ?? '',
    // Nettoyer le message (supprimer les prompts vidéo parasites)
    (p.message ?? '').length > 300
      ? (p.message ?? '').substring(0, 300) + '...'
      : (p.message ?? ''),
    p.internal_notes        ?? '',
    new Date(p.created_at).toLocaleDateString('fr-FR')
  ])
}

// ── EXCEL ─────────────────────────────────────────────────────────────────

const EXCEL_HEADERS = [
  'ID ENTREPRISE',
  'NOM',
  'EMAIL',
  'TÉLÉPHONE',
  'PLAN',
  'TEMPLATE',
  'LIEN PREVIEW',
  'BUDGET (FCFA)',
  'STATUT',
  'RÉGION',
  'SECTEUR',
  'MESSAGE CLIENT',
  'COMMENTAIRE',
  'DATE INSCRIPTION'
]

function buildExcelRows(prospects: ProspectExport[]): (string | number)[][] {
  return prospects.map(p => [
    p.enterprise_id                ?? '',
    p.name                         ?? '',
    p.email                        ?? '',
    p.phone                        ?? '',
    p.package_type                 ?? '',
    p.template_title               ?? '',
    p.template_preview_url         ?? '',
    p.budget ?? '',
    p.prospect_status              ?? '',
    p.region                       ?? '',
    p.sector                       ?? '',
    p.message                      ?? '',
    p.internal_notes               ?? '',
    new Date(p.created_at).toLocaleDateString('fr-FR')
  ])
}

export function exportExcel(
  prospects: ProspectExport[],
  filename: string
) {
  const rows   = buildExcelRows(prospects)
  const wsData = [EXCEL_HEADERS, ...rows]
  const ws     = XLSX.utils.aoa_to_sheet(wsData)

  // Largeurs colonnes
  ws['!cols'] = [
    { wch: 38 },  // ID ENTREPRISE
    { wch: 22 },  // NOM
    { wch: 30 },  // EMAIL
    { wch: 22 },  // TÉLÉPHONE
    { wch: 14 },  // PLAN
    { wch: 26 },  // TEMPLATE
    { wch: 45 },  // LIEN PREVIEW
    { wch: 18 },  // BUDGET
    { wch: 14 },  // STATUT
    { wch: 16 },  // RÉGION
    { wch: 18 },  // SECTEUR
    { wch: 60 },  // MESSAGE CLIENT
    { wch: 50 },  // COMMENTAIRE
    { wch: 18 },  // DATE
  ]

  // Hauteur header
  if (!ws['!rows']) ws['!rows'] = []
  ws['!rows'][0] = { hpt: 22 }

  // Style header : fond noir, texte blanc, gras, centré
  EXCEL_HEADERS.forEach((_, i) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: i })
    if (!ws[cellRef]) return
    ws[cellRef].s = {
      font:      { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill:      { patternType: 'solid', fgColor: { rgb: '111111' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        bottom: { style: 'medium', color: { rgb: '39FF14' } }
      }
    }
  })

  // Style données : wrap text sur MESSAGE et COMMENTAIRE
  for (let r = 1; r <= rows.length; r++) {
    // Alternance couleur de fond
    const bg = r % 2 === 0 ? 'F5F5F5' : 'FFFFFF'
    EXCEL_HEADERS.forEach((_, c) => {
      const cellRef = XLSX.utils.encode_cell({ r, c })
      if (!ws[cellRef]) return
      ws[cellRef].s = {
        fill:      { patternType: 'solid', fgColor: { rgb: bg } },
        alignment: {
          vertical:  'top',
          wrapText:  c === 11 || c === 12  // MESSAGE et COMMENTAIRE
        },
        font: {
          bold:  c === 1, // NOM en gras
          color: { rgb: c === 7 ? '229922' : '1A1A1A' } // BUDGET en vert
        }
      }
    })
    // Hauteur lignes données
    ws['!rows'][r] = { hpt: 40 }
  }

  // Freeze première ligne
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }

  // Auto-filter sur toutes les colonnes
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: rows.length, c: EXCEL_HEADERS.length - 1 }
    })
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Prospects')

  // Propriétés du classeur
  wb.Props = {
    Title:   'Pipeline Prospects',
    Author:  'Autoslash AI',
    Company: 'Autoslash AI'
  }

  XLSX.writeFile(wb, `${filename}.xlsx`)
}



export function exportTXT(
  prospects: ProspectExport[],
  filename: string
) {
  const line  = '─'.repeat(80)
  const dline = '═'.repeat(80)

  let content = ''

  // ── EN-TÊTE ──
  content += dline + '\n'
  content += '  PIPELINE PROSPECTS — AUTOSLASH AI\n'
  content += `  Exporté le : ${new Date().toLocaleDateString('fr-FR')}\n`
  content += `  Nombre de prospects : ${prospects.length}\n`
  content += dline + '\n\n'

  // ── TABLEAU SYNTHÈSE ──
  content += '  TABLEAU DE SYNTHÈSE\n'
  content += line + '\n'
  content += padR('NOM',            22)
  content += padR('PLAN',           14)
  content += padR('STATUT',         14)
  content += padR('BUDGET (FCFA)',  18)
  content += padR('RÉGION',         14)
  content += padR('DATE',           12)
  content += '\n'
  content += line + '\n'

  prospects.forEach(p => {
    content += padR(p.name ?? '',                        22)
    content += padR(p.package_type ?? '',                14)
    content += padR(p.prospect_status ?? '',             14)
    content += padR(
      p.budget ? p.budget.toLocaleString('fr-FR') + ' F' : '—',
      18
    )
    content += padR(p.region ?? '',                      14)
    content += padR(
      new Date(p.created_at).toLocaleDateString('fr-FR'),
      12
    )
    content += '\n'
  })

  content += line + '\n\n\n'

  // ── FICHES DÉTAIL ──
  prospects.forEach((p, idx) => {
    content += dline + '\n'
    content += `  ${String(idx + 1).padStart(2, '0')}. ${p.name.toUpperCase()}`
    content += `   [${p.package_type ?? ''}]\n`
    content += dline + '\n\n'

    content += '  CONTACT\n'
    content += line + '\n'
    content += row('ID',           p.enterprise_id ?? '')
    content += row('Email',        p.email         ?? '')
    content += row('Téléphone',    p.phone         ?? '')
    content += row('Région',       p.region        ?? '')
    content += row('Secteur',      p.sector        ?? '')
    content += '\n'

    content += '  COMMANDE\n'
    content += line + '\n'
    content += row('Plan',         p.package_type         ?? '')
    content += row('Template',     p.template_title       ?? '')
    content += row('Lien Preview', p.template_preview_url ?? '')
    content += row('Budget',
      p.budget ? p.budget.toLocaleString('fr-FR') + ' FCFA' : '—'
    )
    content += '\n'

    content += '  SUIVI\n'
    content += line + '\n'
    content += row('Statut',  p.prospect_status ?? '')
    content += row('Rappel',
      p.rappel_at
        ? new Date(p.rappel_at).toLocaleDateString('fr-FR')
        : '—'
    )
    content += row('Inscription',
      new Date(p.created_at).toLocaleDateString('fr-FR')
    )
    content += '\n'

    content += '  MESSAGE CLIENT\n'
    content += line + '\n'
    content += (p.message ?? 'Aucun message')
      .split('\n')
      .map(l => `  ${l}`)
      .join('\n')
    content += '\n\n'

    content += '  COMMENTAIRE\n'
    content += line + '\n'
    content += (p.internal_notes ?? 'Aucun commentaire')
      .split('\n')
      .map(l => `  ${l}`)
      .join('\n')
    content += '\n\n\n'
  })

  // ── PIED DE PAGE ──
  content += dline + '\n'
  content += `  FIN DU RAPPORT — ${prospects.length} prospects\n`
  content += dline + '\n'

  // ── TÉLÉCHARGEMENT ──
  const blob = new Blob(['\uFEFF' + content], {
    type: 'text/plain;charset=utf-8;'
  })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href  = url
  link.setAttribute('download', `${filename}.txt`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ── Helpers ──
function padR(text: string, width: number): string {
  const t = (text ?? '').substring(0, width - 1)
  return t.padEnd(width, ' ')
}

function row(label: string, value: string): string {
  return `  ${label.padEnd(16, ' ')} : ${value}\n`
}

export async function exportWord(
  prospects: ProspectExport[],
  filename: string
) {
  const border = {
    style: 'single' as const,
    size: 4,
    color: 'CCCCCC'
  }
  const allBorders = {
    top: border, bottom: border,
    left: border, right: border
  }

  // ── Cellule header ──
  const hCell = (text: string, w: number) =>
    new TableCell({
      width:   { size: w, type: WidthType.DXA },
      borders: allBorders,
      shading: { type: ShadingType.CLEAR, fill: 'E8E8E8' },
      margins: { top: 100, bottom: 100, left: 150, right: 150 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing:   { before: 40, after: 40 },
        children:  [new TextRun({
          text, bold: true, size: 18, color: '111111'
        })]
      })]
    })

  // ── Cellule donnée ──
  const dCell = (
    text: string,
    w: number,
    opts: { bold?: boolean; color?: string; bg?: string; center?: boolean } = {}
  ) =>
    new TableCell({
      width:   { size: w, type: WidthType.DXA },
      borders: allBorders,
      shading: { type: ShadingType.CLEAR, fill: opts.bg ?? 'FFFFFF' },
      margins: { top: 80, bottom: 80, left: 150, right: 150 },
      children: [new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing:   { before: 40, after: 40 },
        children:  [new TextRun({
          text:  text ?? '—',
          bold:  opts.bold  ?? false,
          size:  17,
          color: opts.color ?? '222222'
        })]
      })]
    })

  // ── Ligne séparatrice verte ──
  const greenLine = new Paragraph({
    border: {
      bottom: { style: 'single' as const, size: 12, color: '22CC44' }
    },
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: '' })]
  })

  // ── Titre de section ──
  const sectionTitle = (text: string) =>
    new Paragraph({
      spacing: { before: 300, after: 120 },
      children: [new TextRun({
        text,
        bold:  true,
        size:  22,
        color: '111111',
        allCaps: true
      })]
    })

  // ════════════════════════
  // PAGE DE GARDE
  // ════════════════════════
  const cover = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:   { before: 1800, after: 200 },
      children:  [new TextRun({
        text: 'PIPELINE PROSPECTS',
        bold: true, size: 64, color: '111111'
      })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:   { after: 500 },
      children:  [new TextRun({
        text: 'AUTOSLASH AI',
        bold: true, size: 40, color: '22CC44'
      })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:   { after: 200 },
      children:  [new TextRun({
        text: `Date d'export : ${new Date().toLocaleDateString('fr-FR')}`,
        size: 24, color: '666666'
      })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:   { after: 1200 },
      children:  [new TextRun({
        text: `Nombre de prospects : ${prospects.length}`,
        bold: true, size: 28, color: '333333'
      })]
    }),
    greenLine,
    new Paragraph({
      pageBreakBefore: true,
      children: [new TextRun({ text: '' })]
    })
  ]

  // ════════════════════════
  // TABLEAU SYNTHÈSE
  // ════════════════════════
  const synthHeader = new TableRow({
    tableHeader: true,
    children: [
      hCell('NOM',           1600),
      hCell('EMAIL',         2400),
      hCell('TÉLÉPHONE',     1700),
      hCell('PLAN',          1000),
      hCell('TEMPLATE',      1900),
      hCell('BUDGET (FCFA)', 1500),
      hCell('STATUT',        1200),
      hCell('RAPPEL',        1200),
      hCell('RÉGION',        1200),
      hCell('DATE',          1100),
    ]
  })

  const synthRows = prospects.map((p, i) => {
    const bg = i % 2 === 0 ? 'FFFFFF' : 'F5F5F5'
    const statusColor =
      p.prospect_status === 'CONVERTI' ? '229922' :
      p.prospect_status === 'RAPPELER' ? 'CC6600' :
      p.prospect_status === 'ANNULÉ'   ? '999999' : '333333'

    return new TableRow({ children: [
      dCell(p.name ?? '',
        1600, { bold: true, bg }),
      dCell(p.email ?? '',
        2400, { color: '2255BB', bg }),
      dCell(p.phone ?? '',
        1700, { bg }),
      dCell(p.package_type ?? '',
        1000, { center: true, bg }),
      dCell(p.template_title ?? '',
        1900, { bg }),
      dCell(
        p.budget ? p.budget.toLocaleString('fr-FR') + ' F' : '—',
        1500, { bold: !!p.budget, color: p.budget ? '116611' : '999999', bg }
      ),
      dCell(p.prospect_status ?? '',
        1200, { bold: true, color: statusColor, center: true, bg }),
      dCell(
        p.rappel_at
          ? new Date(p.rappel_at).toLocaleDateString('fr-FR')
          : '—',
        1200, { bg }),
      dCell(p.region ?? '',
        1200, { bg }),
      dCell(
        new Date(p.created_at).toLocaleDateString('fr-FR'),
        1100, { bg }),
    ]})
  })

  const syntheseTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows:  [synthHeader, ...synthRows]
  })

  // ════════════════════════
  // FICHES DÉTAIL
  // ════════════════════════
  const fiches: (Paragraph | Table)[] = []

  prospects.forEach((p, idx) => {
    // Saut de page
    fiches.push(new Paragraph({
      pageBreakBefore: true,
      children: [new TextRun({ text: '' })]
    }))

    // Titre prospect
    fiches.push(new Paragraph({
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: `${String(idx + 1).padStart(2, '0')}. ${p.name.toUpperCase()}`,
          bold: true, size: 40, color: '111111'
        }),
        new TextRun({
          text: `   [${p.package_type ?? ''}]`,
          bold: true, size: 26, color: '888888'
        })
      ]
    }))

    fiches.push(greenLine)

    // ── Tableau CONTACT + COMMANDE ──
    fiches.push(new Paragraph({
      spacing: { before: 240, after: 120 },
      children: [new TextRun({
        text: 'INFORMATIONS', bold: true,
        size: 20, color: '444444', allCaps: true
      })]
    }))

    const infoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          hCell('CHAMP',   2000),
          hCell('VALEUR',  6000),
          hCell('CHAMP',   2000),
          hCell('VALEUR',  6000),
        ]}),
        new TableRow({ children: [
          dCell('ID',        2000, { bold: true, bg: 'F5F5F5' }),
          dCell(p.enterprise_id ?? '', 6000, { color: '888888', bg: 'F5F5F5' }),
          dCell('EMAIL',     2000, { bold: true }),
          dCell(p.email ?? '', 6000, { color: '2255BB' }),
        ]}),
        new TableRow({ children: [
          dCell('TÉLÉPHONE', 2000, { bold: true, bg: 'F5F5F5' }),
          dCell(p.phone ?? '', 6000, { bg: 'F5F5F5' }),
          dCell('RÉGION',    2000, { bold: true }),
          dCell(p.region ?? '', 6000),
        ]}),
        new TableRow({ children: [
          dCell('PLAN',      2000, { bold: true, bg: 'F5F5F5' }),
          dCell(p.package_type ?? '', 6000, { bg: 'F5F5F5' }),
          dCell('SECTEUR',   2000, { bold: true }),
          dCell(p.sector ?? '', 6000),
        ]}),
        new TableRow({ children: [
          dCell('TEMPLATE',  2000, { bold: true, bg: 'F5F5F5' }),
          dCell(p.template_title ?? '', 6000, { bg: 'F5F5F5' }),
          dCell('BUDGET',    2000, { bold: true }),
          dCell(
            p.budget ? p.budget.toLocaleString('fr-FR') + ' FCFA' : '—',
            6000, { bold: !!p.budget, color: p.budget ? '116611' : '999999' }
          ),
        ]}),
        new TableRow({ children: [
          dCell('LIEN',      2000, { bold: true, bg: 'F5F5F5' }),
          dCell(p.template_preview_url ?? '', 6000, { color: '2255BB', bg: 'F5F5F5' }),
          dCell('STATUT',    2000, { bold: true }),
          dCell(p.prospect_status ?? '', 6000, {
            bold: true,
            color: p.prospect_status === 'CONVERTI' ? '229922' :
                   p.prospect_status === 'RAPPELER' ? 'CC6600' :
                   p.prospect_status === 'ANNULÉ'   ? '999999' : '333333'
          }),
        ]}),
        new TableRow({ children: [
          dCell('RAPPEL',    2000, { bold: true, bg: 'F5F5F5' }),
          dCell(
            p.rappel_at
              ? new Date(p.rappel_at).toLocaleDateString('fr-FR')
              : '—',
            6000, { bg: 'F5F5F5' }
          ),
          dCell('INSCRIPTION', 2000, { bold: true }),
          dCell(new Date(p.created_at).toLocaleDateString('fr-FR'), 6000),
        ]}),
      ]
    })

    fiches.push(infoTable)

    // ── Tableau MESSAGE ──
    fiches.push(new Paragraph({
      spacing: { before: 300, after: 120 },
      children: [new TextRun({
        text: 'MESSAGE CLIENT',
        bold: true, size: 20, color: '444444', allCaps: true
      })]
    }))

    fiches.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [
        new TableCell({
          borders: allBorders,
          shading: { type: ShadingType.CLEAR, fill: 'F9F9F9' },
          margins: { top: 160, bottom: 160, left: 200, right: 200 },
          children: [new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [new TextRun({
              text:    p.message || 'Aucun message',
              size:    18,
              color:   p.message ? '222222' : 'AAAAAA',
              italics: !p.message
            })]
          })]
        })
      ]})]
    }))

    // ── Tableau COMMENTAIRE ──
    fiches.push(new Paragraph({
      spacing: { before: 300, after: 120 },
      children: [new TextRun({
        text: 'COMMENTAIRE',
        bold: true, size: 20, color: '444444', allCaps: true
      })]
    }))

    fiches.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [
        new TableCell({
          borders: allBorders,
          shading: { type: ShadingType.CLEAR, fill: 'FFFDF0' },
          margins: { top: 160, bottom: 160, left: 200, right: 200 },
          children: [new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [new TextRun({
              text:    p.internal_notes || 'Aucun commentaire',
              size:    18,
              color:   p.internal_notes ? '222222' : 'AAAAAA',
              italics: !p.internal_notes
            })]
          })]
        })
      ]})]
    }))
  })

  // ════════════════════════
  // ASSEMBLAGE
  // ════════════════════════
  const doc = new Document({
    styles: {
      paragraphStyles: [{
        id: 'Normal', name: 'Normal',
        run: { font: 'Calibri', size: 18 }
      }]
    },
    sections: [
      // Page de garde
      {
        properties: {},
        children: cover
      },
      // Tableau synthèse paysage
      {
        properties: {
          page: {
            size: {
              orientation: 'landscape' as const,
              width: 16838, height: 11906
            },
            margin: {
              top: 720, bottom: 720,
              left: 720, right: 720
            }
          }
        },
        children: [
          sectionTitle('Tableau de synthèse'),
          syntheseTable
        ]
      },
      // Fiches détail portrait
      {
        properties: {
          page: {
            size: {
              orientation: 'portrait' as const,
              width: 11906, height: 16838
            },
            margin: {
              top: 900, bottom: 900,
              left: 1000, right: 1000
            }
          }
        },
        children: fiches
      }
    ]
  })

  const buffer = await Packer.toBuffer(doc)
  saveAs(new Blob([buffer]), `${filename}.docx`)
}
