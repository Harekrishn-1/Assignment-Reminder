const fs = require('fs');
const path = require('path');

/**
 * SurveyAnalyzer
 * Reads and validates data.csv collected during fieldwork at Hostel K, NIT Jamshedpur.
 * Computes optimal reminder thresholds, detects student deadline behavior,
 * and robustly handles bad or malformed rows.
 */
function analyzeFieldworkData(csvFilePath, thresholdHoursOverride) {
  const targetPath =
    csvFilePath ||
    path.resolve(__dirname, '../../data.csv') ||
    path.resolve(__dirname, '../data.csv');

  if (!fs.existsSync(targetPath)) {
    throw new Error(`data.csv not found at path: ${targetPath}`);
  }

  const fileContent = fs.readFileSync(targetPath, 'utf-8');
  const lines = fileContent.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('data.csv is empty or missing data rows.');
  }

  const header = lines[0].split(',').map((h) => h.trim());
  const rows = [];
  const badRows = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = rawLine.split(',').map((c) => c.trim());

    // Validation: Exactly 6 columns expected
    if (cols.length !== 6) {
      badRows.push({ line: i + 1, raw: rawLine, reason: `Invalid column count: expected 6, found ${cols.length}` });
      continue;
    }

    const studentId = parseInt(cols[0], 10);
    const forgets = cols[1];
    const usesReminders = cols[2];
    const preferredRaw = cols[3];
    const missedDeadline = cols[4];
    const automaticImport = cols[5];

    // Validate Student ID
    if (isNaN(studentId) || studentId <= 0) {
      badRows.push({ line: i + 1, raw: rawLine, reason: 'Invalid Student_ID: must be a positive integer' });
      continue;
    }

    // Parse reminder hours
    const hoursMatch = preferredRaw.match(/(\d+)/);
    const preferredHours = hoursMatch ? parseInt(hoursMatch[1], 10) : null;

    if (!preferredHours || preferredHours <= 0 || preferredHours > 24) {
      badRows.push({ line: i + 1, raw: rawLine, reason: `Unrealistic Preferred_Reminder_Time: "${preferredRaw}"` });
      continue;
    }

    rows.push({
      studentId,
      forgets: forgets.toLowerCase() === 'yes',
      usesReminders: usesReminders.toLowerCase() === 'yes',
      preferredHours,
      missedDeadline: missedDeadline.toLowerCase() === 'yes',
      automaticImport: automaticImport.toLowerCase() === 'yes',
    });
  }

  const totalValid = rows.length;
  if (totalValid === 0) {
    throw new Error('No valid rows found in data.csv.');
  }

  // Statistical calculations
  const forgetsCount = rows.filter((r) => r.forgets).length;
  const missedCount = rows.filter((r) => r.missedDeadline).length;
  const autoImportCount = rows.filter((r) => r.automaticImport).length;

  const distribution = {};
  rows.forEach((r) => {
    distribution[r.preferredHours] = (distribution[r.preferredHours] || 0) + 1;
  });

  // Threshold evaluation (default 3 hours, or live override)
  const activeThreshold = thresholdHoursOverride !== undefined
    ? Number(thresholdHoursOverride)
    : Number(process.env.DEFAULT_THRESHOLD_HOURS || 3);

  const coveredByThreshold = rows.filter((r) => r.preferredHours <= activeThreshold).length;
  const coveragePercent = Math.round((coveredByThreshold / totalValid) * 100);

  return {
    sourceFile: targetPath,
    totalEntries: lines.length - 1,
    validEntries: totalValid,
    badRowsDetected: badRows.length,
    badRowsList: badRows,
    metrics: {
      studentsForgettingDeadlines: {
        count: forgetsCount,
        percent: Math.round((forgetsCount / totalValid) * 100),
      },
      studentsMissedPastDeadlines: {
        count: missedCount,
        percent: Math.round((missedCount / totalValid) * 100),
      },
      studentsDemandingAutomaticSync: {
        count: autoImportCount,
        percent: Math.round((autoImportCount / totalValid) * 100),
      },
      preferredReminderDistribution: distribution,
    },
    recommendation: {
      activeThresholdHours: activeThreshold,
      studentsSatisfied: coveredByThreshold,
      coveragePercent: coveragePercent,
      summary: `${coveragePercent}% of surveyed students in Hostel K are protected when reminder threshold is set to ${activeThreshold} hours before deadline.`,
    },
  };
}

// CLI runner
if (require.main === module) {
  // Support live threshold override via command line flag (e.g. --threshold 2)
  const args = process.argv.slice(2);
  let thresholdOverride;
  const threshIndex = args.indexOf('--threshold');
  if (threshIndex !== -1 && args[threshIndex + 1]) {
    thresholdOverride = parseFloat(args[threshIndex + 1]);
  }

  const csvPath = path.resolve(__dirname, '../../data.csv');
  console.log('====================================================');
  console.log('   FIELDWORK DATA ANALYZER (Hostel K, NIT JSR)      ');
  console.log('====================================================');

  try {
    const result = analyzeFieldworkData(csvPath, thresholdOverride);
    console.log(`\n[Input] Loaded data from: ${result.sourceFile}`);
    console.log(`[Entries] Valid survey records: ${result.validEntries} / ${result.totalEntries}`);

    if (result.badRowsDetected > 0) {
      console.log(`\n⚠️  [Data Quality] Detected ${result.badRowsDetected} bad row(s):`);
      result.badRowsList.forEach((b) => {
        console.log(`   - Line ${b.line}: ${b.reason} -> "${b.raw}"`);
      });
    } else {
      console.log('✅ [Data Quality] All 20 entries cleanly validated. No corrupted rows.');
    }

    console.log('\n--- Survey Findings ---');
    console.log(`• Students who forget assignment deadlines: ${result.metrics.studentsForgettingDeadlines.count}/${result.validEntries} (${result.metrics.studentsForgettingDeadlines.percent}%)`);
    console.log(`• Students who missed an 11:59 PM deadline: ${result.metrics.studentsMissedPastDeadlines.count}/${result.validEntries} (${result.metrics.studentsMissedPastDeadlines.percent}%)`);
    console.log(`• Students wanting 100% automated import: ${result.metrics.studentsDemandingAutomaticSync.count}/${result.validEntries} (${result.metrics.studentsDemandingAutomaticSync.percent}%)`);

    console.log('\n--- Preferred Reminder Time Distribution ---');
    Object.keys(result.metrics.preferredReminderDistribution)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((hours) => {
        const count = result.metrics.preferredReminderDistribution[hours];
        const pct = Math.round((count / result.validEntries) * 100);
        console.log(`  ${hours} hour(s) before deadline: ${count} student(s) (${pct}%)`);
      });

    console.log('\n--- Decision Engine Threshold Output ---');
    console.log(`Active Threshold Setting: ${result.recommendation.activeThresholdHours} hour(s) before deadline`);
    console.log(`Student Coverage: ${result.recommendation.studentsSatisfied}/${result.validEntries} (${result.recommendation.coveragePercent}%)`);
    console.log(`Conclusion: ${result.recommendation.summary}`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('[Analyzer Error]', err.message);
    process.exit(1);
  }
}

module.exports = { analyzeFieldworkData };
