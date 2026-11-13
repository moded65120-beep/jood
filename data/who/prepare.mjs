// Offline preparation/validation only. Nothing in the application imports this file.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'

const root = new URL('./', import.meta.url)
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const sources = await readJson('sources.json')
assert.equal(sources.filter((source) => source.file.endsWith('.xlsx')).length, 12)
for (const source of sources) {
  const bytes = await readFile(new URL(source.file, root))
  assert.equal(hash(bytes), source.sha256, `Checksum: ${source.file}`)
  assert.equal(bytes.length, source.bytes)
  assert.ok(source.file.endsWith('.xlsx') ? bytes.subarray(0, 2).toString() === 'PK' : bytes.subarray(0, 4).toString() === '%PDF')
}

const zColumns = ['SD4neg', 'SD3neg', 'SD2neg', 'SD1neg', 'SD0', 'SD1', 'SD2', 'SD3', 'SD4']
const percentileColumns = ['P01', 'P1', 'P3', 'P5', 'P10', 'P15', 'P25', 'P50', 'P75', 'P85', 'P90', 'P95', 'P97', 'P99', 'P999']
const report = { status: 'passed', sourceFilesVerified: sources.length, workbooks: 12, sourceRows: 0, normalizedRows: 0, results: [] }
await mkdir(new URL('reference/', root), { recursive: true })
for (const [indicator, unit] of [['wfa', 'kg'], ['lhfa', 'cm'], ['hcfa', 'cm']]) {
  for (const [sourceSex, sex] of [['boys', 'male'], ['girls', 'female']]) {
    const name = `${indicator}-${sourceSex}`
    const z = await readJson(`extracted/${name}-zscore-expanded-tables.json`)
    const p = await readJson(`extracted/${name}-percentiles-expanded-tables.json`)
    for (const [table, expectedColumns] of [[z, zColumns], [p, percentileColumns]]) {
      const source = sources.find((entry) => entry.file === table.sourceFile)
      assert.equal(table.sourceSha256, source.sha256)
      assert.equal(table.rows.length, 1857)
      assert.ok(['Age', 'Day'].includes(table.columns[0]))
      assert.deepEqual(table.columns.slice(1), ['L', 'M', 'S', ...expectedColumns])
      table.rows.forEach((row, day) => {
        assert.equal(row.length, table.columns.length)
        assert.equal(Number(row[0]), day, `Missing/duplicate/out-of-order day in ${name}`)
        assert.ok(row.every((value) => value !== '' && Number.isFinite(Number(value))))
        assert.ok(Number(row[2]) > 0 && Number(row[3]) > 0)
        const references = row.slice(4).map(Number)
        assert.ok(references.every((value, index) => value > 0 && (index === 0 || value > references[index - 1])))
      })
      report.sourceRows += table.rows.length
    }

    let maxZScoreReconstructionError = 0
    let maxMedianRoundingError = 0
    const rows = z.rows.map((row, day) => {
      const percentileRow = p.rows[day]
      assert.deepEqual(row.slice(0, 4).map(Number), percentileRow.slice(0, 4).map(Number), `LMS mismatch ${name}/${day}`)
      const [ageDays, L, M, S] = row.slice(0, 4).map(Number)
      if (indicator !== 'wfa') assert.equal(L, 1)
      // Reconstruct only as an independent check, NEVER as replacement data.
      const centileAtZ = (score) => L === 0 ? M * Math.exp(S * score) : M * (1 + L * S * score) ** (1 / L)
      for (let score = -4; score <= 4; score += 1) {
        let expected = centileAtZ(score)
        if (indicator === 'wfa' && score === 4) expected = 2 * centileAtZ(3) - centileAtZ(2)
        if (indicator === 'wfa' && score === -4) expected = 2 * centileAtZ(-3) - centileAtZ(-2)
        const difference = Math.abs(expected - Number(row[score + 8]))
        maxZScoreReconstructionError = Math.max(maxZScoreReconstructionError, difference)
        assert.ok(difference <= 0.00050001, `${name}/${day}/${score}: Z reference differs beyond 3-decimal rounding`)
      }
      const medianDifference = Math.abs(M - Number(percentileRow[p.columns.indexOf('P50')]))
      maxMedianRoundingError = Math.max(maxMedianRoundingError, medianDifference)
      assert.ok(medianDifference <= 0.00050001)
      assert.ok(Math.abs(Number(row[z.columns.indexOf('SD0')]) - Number(percentileRow[p.columns.indexOf('P50')])) <= 0.00100001)
      return {
        ageDays, L, M, S,
        measurementMethod: indicator === 'lhfa' ? (ageDays <= 730 ? 'recumbent_length' : 'standing_height') : null,
        zScores: Object.fromEntries(zColumns.map((column, index) => [String(index - 4), Number(row[index + 4])])),
        percentiles: Object.fromEntries(percentileColumns.map((column, index) => [column === 'P01' ? '0.1' : column === 'P999' ? '99.9' : column.slice(1), Number(percentileRow[index + 4])])),
      }
    })
    if (indicator === 'lhfa') {
      assert.equal(rows[730].measurementMethod, 'recumbent_length')
      assert.equal(rows[731].measurementMethod, 'standing_height')
      assert.ok(rows[731].M < rows[730].M, 'Expected WHO length/height discontinuity')
    }
    // Keep the complete official coverage, including every day needed for a
    // third birthday in both leap-year and non-leap-year calendars.
    for (let day = 0; day <= 1096; day += 1) assert.equal(rows[day].ageDays, day)
    const output = {
      schemaVersion: 1, datasetId: `who-cgs-${indicator === 'hcfa' ? '2007' : '2006'}-${indicator}-${sex}`,
      indicator, sex, unit, ageUnit: 'day', coverage: { minAgeDays: 0, maxAgeDays: 1856, intervalDays: 1 },
      standardPublicationYear: indicator === 'hcfa' ? 2007 : 2006,
      sourceFiles: [z.sourceFile, p.sourceFile],
      sourceSheets: [z.sheet, p.sheet], rows,
    }
    const serialized = JSON.stringify(output) + '\n'
    await writeFile(new URL(`reference/${indicator}-${sex}.json`, root), serialized)
    // Check every generated value survives serialization exactly.
    assert.deepEqual(JSON.parse(serialized), output)
    report.normalizedRows += rows.length
    report.results.push({ file: `reference/${indicator}-${sex}.json`, rows: rows.length, maxZScoreReconstructionError, maxMedianRoundingError, sha256: hash(serialized), workbookCreated: z.workbookCreated, workbookModified: z.workbookModified })
  }
}
await writeFile(new URL('validation-report.json', root), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
