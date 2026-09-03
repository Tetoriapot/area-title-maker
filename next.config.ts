import type { NextConfig } from 'next';

const isGitHubPagesBuild = process.env.GITHUB_PAGES === 'true';
const pagesAssetPrefix = process.env.SITE_URL?.replace(/\/+$/, '');

const nextConfig: NextConfig = isGitHubPagesBuild
  ? {
      // This app has a single route. An absolute asset prefix keeps Vinext's
      // exported files at the artifact root while still supporting project
      // Pages URLs such as https://owner.github.io/repository/.
      assetPrefix: pagesAssetPrefix,
      output: 'export',
      trailingSlash: true,
    }
  : {};

export default nextConfig;
