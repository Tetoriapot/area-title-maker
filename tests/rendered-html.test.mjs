import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import test from 'node:test';

const outputRoot = resolve('dist/client');
const indexPath = resolve(outputRoot, 'index.html');
const staticRoot = resolve(outputRoot, '_next/static');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('GitHub Pages output uses the configured project URL', () => {
  const configuredUrl = process.env.SITE_URL;
  assert.ok(configuredUrl, 'SITE_URL is required for the Pages artifact test');
  assert.ok(existsSync(indexPath), 'dist/client/index.html is missing');
  assert.ok(existsSync(staticRoot), 'dist/client/_next/static is missing');
  assert.ok(readdirSync(staticRoot).length > 0, '_next/static is empty');
  assert.ok(
    existsSync(resolve(outputRoot, 'favicon.svg')),
    'favicon.svg is missing',
  );
  assert.ok(existsSync(resolve(outputRoot, 'og.png')), 'og.png is missing');

  const siteUrl = new URL(
    configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`,
  );
  const html = readFileSync(indexPath, 'utf8');

  assert.doesNotMatch(html, /http:\/\/localhost(?::\d+)?/i);
  assert.doesNotMatch(
    html,
    /(?:src|href)=["']\/(?:_next\/|favicon\.svg|og\.png)/i,
    'A root-relative asset URL would break on a project Pages site',
  );
  assert.match(html, new RegExp(escapeRegExp(siteUrl.href)));

  const assetReferences = [
    ...html.matchAll(/(?:src|href)=["']([^"']+)["']/gi),
  ].map((match) => match[1]);

  for (const reference of assetReferences) {
    const url = new URL(reference, siteUrl);
    if (
      url.origin !== siteUrl.origin ||
      !url.pathname.startsWith(siteUrl.pathname)
    ) {
      continue;
    }

    const relativePath = decodeURIComponent(
      url.pathname.slice(siteUrl.pathname.length),
    ).replace(/^\/+/, '');
    if (!relativePath || relativePath.endsWith('/')) continue;

    const candidatePath = resolve(outputRoot, relativePath);
    assert.ok(
      candidatePath === outputRoot ||
        candidatePath.startsWith(`${outputRoot}${sep}`),
      `Referenced asset escapes the Pages artifact: ${relativePath}`,
    );
    assert.ok(
      existsSync(candidatePath),
      `Referenced asset is missing: ${relativePath}`,
    );
  }
});
