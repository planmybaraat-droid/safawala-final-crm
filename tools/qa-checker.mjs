/**
 * SAFAWALA CRM — QA Checker
 * Scans franchise CRM files for common error patterns.
 * Run: node tools/qa-checker.mjs [optional path]
 *
 * Exit codes: 0 = pass, 1 = issues found
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const CYAN  = '\x1b[36m'
const RED   = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW= '\x1b[33m'
const BOLD  = '\x1b[1m'
const DIM   = '\x1b[2m'
const RESET = '\x1b[0m'

// ─── Rules ────────────────────────────────────────────────────────────────────
const RULES = [
  {
    id: 'NO_RAW_FETCH',
    severity: 'error',
    message: 'Raw fetch() found outside hook. Use useSafeData() or useSafePost() instead.',
    test: (content, file) => {
      // Allow raw fetch inside lib/ and api/ and hooks files
      if (file.includes('/api/') || file.includes('/lib/') || file.includes('/hooks')) return []
      const lines = content.split('\n')
      return lines
        .map((l, i) => ({ line: i + 1, content: l, prevBlock: lines.slice(Math.max(0,i-8), i).join(' ') }))
        .filter(({ content, prevBlock }) =>
          content.match(/\bfetch\s*\(/) &&
          !content.trim().startsWith('//') &&
          !content.trim().startsWith('*') &&
          !prevBlock.includes('intentional') &&
          !prevBlock.includes('eslint-disable') &&
          !prevBlock.includes('Raw fetch')
        )
        .map(({ line, content }) => ({ line, snippet: content.trim() }))
    },
  },
  {
    id: 'MISSING_TRY_CATCH',
    severity: 'error',
    message: 'async function without try/catch detected.',
    test: (content) => {
      const lines = content.split('\n')
      const issues = []
      let inAsync = false
      let asyncStart = -1
      let depth = 0
      let hasTryCatch = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.match(/\basync\s+(function|\(|=>)/) && !line.trim().startsWith('//')) {
          inAsync = true
          asyncStart = i + 1
          hasTryCatch = false
          depth = 0
        }
        if (inAsync) {
          depth += (line.match(/{/g) || []).length
          depth -= (line.match(/}/g) || []).length
          if (line.includes('try {') || line.includes('try{')) hasTryCatch = true
          if (line.match(/\bawait\s+fetch\b/) && !hasTryCatch) {
            issues.push({ line: i + 1, snippet: line.trim() })
          }
          if (depth < 0) { inAsync = false }
        }
      }
      return issues
    },
  },
  {
    id: 'MISSING_CREDENTIALS',
    severity: 'warning',
    message: "fetch() call missing credentials: 'include' — session won't be sent.",
    test: (content, file) => {
      if (file.includes('/api/')) return []
      const lines = content.split('\n')
      const issues = []
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/\bfetch\s*\(/) && !lines[i].trim().startsWith('//')) {
          // Check next 5 lines for credentials
          const block = lines.slice(i, i + 6).join(' ')
          if (!block.includes('credentials')) {
            issues.push({ line: i + 1, snippet: lines[i].trim() })
          }
        }
      }
      return issues
    },
  },
  {
    id: 'CONSOLE_LOG',
    severity: 'warning',
    message: 'console.log() found — remove before production or use console.error/warn.',
    test: (content, file) => {
      if (file.includes('/scripts/') || file.includes('/tools/') || file.includes('/scratch/')) return []
      const lines = content.split('\n')
      return lines
        .map((l, i) => ({ line: i + 1, content: l }))
        .filter(({ content }) =>
          content.match(/\bconsole\.log\s*\(/) &&
          !content.trim().startsWith('//')
        )
        .map(({ line, content }) => ({ line, snippet: content.trim() }))
    },
  },
  {
    id: 'UNTYPED_ANY',
    severity: 'info',
    message: ': any without explanation comment — add // eslint-disable or explain why.',
    test: (content, file) => {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return []
      const lines = content.split('\n')
      return lines
        .map((l, i) => ({ line: i + 1, content: l }))
        .filter(({ content }) =>
          content.match(/:\s*any\b/) &&
          !content.trim().startsWith('//') &&
          !content.trim().startsWith('*') &&
          !content.includes('// any') &&
          !content.includes('//any')
        )
        .map(({ line, content }) => ({ line, snippet: content.trim() }))
    },
  },
  {
    id: 'MISSING_ERROR_STATE',
    severity: 'warning',
    message: 'Page/component uses loading state but no error state — add error handling.',
    test: (content, file) => {
      if (!file.endsWith('.tsx')) return []
      if (!content.includes('setLoading') && !content.includes('useState(true)')) return []
      if (content.includes('setError') || content.includes('error,') || content.includes('[error]')) return []
      // Flag the file itself
      return [{ line: 1, snippet: 'File has loading state but no error state' }]
    },
  },
  {
    id: 'MISSING_EMPTY_STATE',
    severity: 'info',
    message: 'Component renders list data but may be missing empty state (no items case).',
    test: (content, file) => {
      if (!file.endsWith('.tsx')) return []
      if (!content.includes('.map(') && !content.includes('.map((')) return []
      if (
        content.includes('length === 0') ||
        content.includes('!data') ||
        content.includes('EmptyState') ||
        content.includes('empty') ||
        content.includes('no results') ||
        content.includes('No ') ||
        content.includes('data?.length')
      ) return []
      return [{ line: 1, snippet: '.map() used without empty state guard' }]
    },
  },
  {
    id: 'NON_NULL_ASSERTION',
    severity: 'warning',
    message: 'Non-null assertion (!) used — could throw at runtime if value is null.',
    test: (content, file) => {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return []
      const lines = content.split('\n')
      return lines
        .map((l, i) => ({ line: i + 1, content: l }))
        .filter(({ content }) =>
          content.match(/[a-zA-Z0-9_\])]!\./) &&
          !content.trim().startsWith('//') &&
          !content.includes('// safe')
        )
        .map(({ line, content }) => ({ line, snippet: content.trim() }))
    },
  },
]

// ─── File Scanner ──────────────────────────────────────────────────────────────
function getFiles(dir, extensions = ['.ts', '.tsx']) {
  const results = []
  if (!fs.existsSync(dir)) return results
  const items = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    if (item.isDirectory()) {
      if (!['node_modules', '.next', '.git', 'dist'].includes(item.name)) {
        results.push(...getFiles(fullPath, extensions))
      }
    } else if (extensions.some(ext => item.name.endsWith(ext))) {
      results.push(fullPath)
    }
  }
  return results
}

// ─── Report Helpers ────────────────────────────────────────────────────────────
function severityColor(s) {
  return s === 'error' ? RED : s === 'warning' ? YELLOW : CYAN
}
function severityIcon(s) {
  return s === 'error' ? '✗' : s === 'warning' ? '⚠' : 'ℹ'
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const targetDir = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(ROOT, 'app/franchise-dashboard')

  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════╗${RESET}`)
  console.log(`${BOLD}${CYAN}║   SAFAWALA CRM — QA Checker                  ║${RESET}`)
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════╝${RESET}`)
  console.log(`${DIM}Scanning: ${targetDir}${RESET}\n`)

  // Also scan components/franchise
  const dirsToScan = [
    targetDir,
    path.join(ROOT, 'components/franchise'),
    path.join(ROOT, 'lib/franchise'),
  ].filter(d => fs.existsSync(d))

  const files = dirsToScan.flatMap(d => getFiles(d))

  let totalErrors = 0
  let totalWarnings = 0
  let totalInfos = 0
  let filesWithIssues = 0

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    const relPath = path.relative(ROOT, file)
    const fileIssues = []

    for (const rule of RULES) {
      const issues = rule.test(content, file)
      for (const issue of issues) {
        fileIssues.push({ ...rule, ...issue })
        if (rule.severity === 'error') totalErrors++
        else if (rule.severity === 'warning') totalWarnings++
        else totalInfos++
      }
    }

    if (fileIssues.length > 0) {
      filesWithIssues++
      console.log(`${BOLD}📄 ${relPath}${RESET}`)
      for (const issue of fileIssues) {
        const col = severityColor(issue.severity)
        const icon = severityIcon(issue.severity)
        console.log(`  ${col}${icon} [${issue.id}]${RESET} Line ${issue.line}: ${issue.message}`)
        if (issue.snippet) {
          console.log(`     ${DIM}→ ${issue.snippet.substring(0, 80)}${RESET}`)
        }
      }
      console.log()
    }
  }

  // Summary
  const totalIssues = totalErrors + totalWarnings + totalInfos
  console.log(`${BOLD}─────────────────────────────────────────────${RESET}`)
  console.log(`${BOLD}QA Summary${RESET}`)
  console.log(`  Files scanned:  ${files.length}`)
  console.log(`  Files with issues: ${filesWithIssues}`)
  console.log(`  ${RED}Errors:   ${totalErrors}${RESET}`)
  console.log(`  ${YELLOW}Warnings: ${totalWarnings}${RESET}`)
  console.log(`  ${CYAN}Info:     ${totalInfos}${RESET}`)

  if (totalIssues === 0) {
    console.log(`\n${GREEN}${BOLD}✓ All checks passed! Zero issues found.${RESET}\n`)
    process.exit(0)
  } else {
    console.log(`\n${totalErrors > 0 ? RED : YELLOW}${BOLD}${totalIssues} issue(s) found across ${filesWithIssues} file(s)${RESET}`)
    if (totalErrors > 0) {
      console.log(`${RED}Fix errors before deploying.${RESET}\n`)
      process.exit(1)
    } else {
      console.log(`${YELLOW}Review warnings for code quality.${RESET}\n`)
      process.exit(0)
    }
  }
}

main().catch(e => {
  console.error('QA Checker crashed:', e)
  process.exit(2)
})
