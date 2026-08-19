import fs from 'fs';
import path from 'path';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const LIVE_URL = 'https://felhosip-web.github.io/Cica-NyT/';
const PR_URL = 'http://localhost:3000/';

async function runLighthouse(url, outputPath) {
  let chrome;
  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
    });

    const options = {
      logLevel: 'error',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port
    };

    const runnerResult = await lighthouse(url, options);
    const reportJson = runnerResult.report;

    fs.writeFileSync(outputPath, reportJson, 'utf8');
    return JSON.parse(reportJson);
  } catch (error) {
    console.error(`Error running Lighthouse on ${url}:`, error);
    return null;
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

function extractScores(report) {
  if (!report || !report.categories) {
    return null;
  }

  const categories = report.categories;
  const getScore = (catKey) => {
    if (categories[catKey] && typeof categories[catKey].score === 'number') {
      return Math.round(categories[catKey].score * 100);
    }
    return null;
  };

  const scores = {
    performance: getScore('performance'),
    accessibility: getScore('accessibility'),
    'best-practices': getScore('best-practices'),
    seo: getScore('seo')
  };

  if (Object.values(scores).some(score => score === null)) {
    return null;
  }

  return scores;
}

async function main() {
  const liveTempPath = path.join(process.cwd(), 'temp-live-lh.json');
  const prTempPath = path.join(process.cwd(), 'temp-pr-lh.json');

  console.log(`Running Lighthouse on LIVE URL: ${LIVE_URL}`);
  const liveReport = await runLighthouse(LIVE_URL, liveTempPath);
  const liveScores = extractScores(liveReport);

  console.log(`Running Lighthouse on PR URL: ${PR_URL}`);
  const prReport = await runLighthouse(PR_URL, prTempPath);
  const prScores = extractScores(prReport);

  // Clean up temp json files
  if (fs.existsSync(liveTempPath)) fs.unlinkSync(liveTempPath);
  if (fs.existsSync(prTempPath)) fs.unlinkSync(prTempPath);

  if (!liveScores) {
    console.error('CRITICAL: Failed to extract Lighthouse scores for LIVE URL.');
    process.exit(1);
  }

  if (!prScores) {
    console.error('CRITICAL: Failed to extract Lighthouse scores for PR URL.');
    process.exit(1);
  }

  const categoryLabels = {
    performance: 'Performance',
    accessibility: 'Accessibility',
    'best-practices': 'Best Practices',
    seo: 'SEO'
  };

  let markdown = '### ⚡ Lighthouse PR Mérés és Összehasonlítás\n\n';
  markdown += '| Kategória | Élő Pages | PR Build | Változás |\n';
  markdown += '| :--- | :---: | :---: | :---: |\n';

  for (const catKey of Object.keys(categoryLabels)) {
    const label = categoryLabels[catKey];
    const liveVal = liveScores[catKey];
    const prVal = prScores[catKey];
    const diff = prVal - liveVal;

    let status = '➖ Nincs változás';
    let diffStr = '0%';
    if (diff > 0) {
      status = '✅ Javulás';
      diffStr = `+${diff}%`;
    } else if (diff < 0) {
      status = '⚠️ Romlás';
      diffStr = `${diff}%`;
    }

    markdown += `| ${label} | ${liveVal}% | ${prVal}% | ${diffStr} (${status}) |\n`;
  }

  markdown += '\n*A teszt az élő Pages oldal (`https://felhosip-web.github.io/Cica-NyT/`) és a PR build (`http://localhost:3000/`) összehasonlításával készült.*';

  const commentPath = path.join(process.cwd(), 'lighthouse-comment.md');
  fs.writeFileSync(commentPath, markdown, 'utf8');
  console.log('Successfully generated lighthouse-comment.md');
}

main().catch(err => {
  console.error('Unhandled error in Lighthouse compare script:', err);
  process.exit(1);
});
