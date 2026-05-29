param(
  [string]$DatabasePath = 'C:\Users\veres.sz\Documents\snomed-ICT-LOINC.accdb',
  [string]$OutputCsv = '.\\tmp_frz_mapping_export.csv'
)

$ErrorActionPreference = 'Stop'

$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$DatabasePath;Persist Security Info=False;"
$conn = New-Object System.Data.OleDb.OleDbConnection $connStr
$conn.Open()

# NOTE:
# - map table and SNOMED description tables are local Access tables.
# - ICD code metadata table is linked and has generic Field1..Field17 column names.
# - Field6 contains dotted ICD code text that matches mapTarget format (e.g., F32.0, R45.1, Z63.0).

$sql = @"
SELECT
  m.mapTarget AS icd_code,
  i.Field9 AS icd_description,
  m.referencedComponentId AS snomed_code,
  d.term AS snomed_term,
  m.mapAdvice AS map_type,
  Left(m.mapTarget,1) AS chapter_tag,
  m.mapGroup,
  m.mapPriority,
  m.mapRule,
  m.correlationId,
  m.mapCategoryId
FROM
  ([Der2_iisssccRefset_ExtendedMapFull_INT_20260301] AS m
  INNER JOIN [Sct2_Description_Full-en_INT_20260301] AS d
    ON m.referencedComponentId = d.conceptId)
  LEFT JOIN [Icd102019syst_codes] AS i
    ON m.mapTarget = i.Field6
WHERE
  m.active = 1
  AND d.active = 1
  AND m.mapTarget Is Not Null
  AND Left(m.mapTarget,1) IN ('F','R','Z')
"@

$cmd = $conn.CreateCommand()
$cmd.CommandText = $sql
$da = New-Object System.Data.OleDb.OleDbDataAdapter $cmd
$dt = New-Object System.Data.DataTable
[void]$da.Fill($dt)

# Deterministic order for reproducible downstream processing
$rows = $dt.Rows | Sort-Object @{Expression='chapter_tag'; Ascending=$true}, @{Expression='icd_code'; Ascending=$true}, @{Expression='snomed_code'; Ascending=$true}, @{Expression='snomed_term'; Ascending=$true}

$rows | Select-Object icd_code, icd_description, snomed_code, snomed_term, map_type, chapter_tag, mapGroup, mapPriority, mapRule, correlationId, mapCategoryId |
  Export-Csv -LiteralPath $OutputCsv -NoTypeInformation -Encoding UTF8

$conn.Close()

$import = Import-Csv -LiteralPath $OutputCsv
"Exported rows: $($import.Count)"
"Output file: $OutputCsv"
"Chapter counts:"
$import | Group-Object chapter_tag | Sort-Object Name | ForEach-Object { "  $($_.Name): $($_.Count)" }
