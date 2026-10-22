import { describe, expect, it } from 'vitest';
import { buildAndroidSnippet, maskDeploymentId, pickPreviewHost } from './deployment-preview';

const deploymentId = 'dep_349d686e-b166-49e1-b099-09fce997067b';
const snippet = `<script src="https://botdock-api.zeeshanahmed.app/widget.js" data-deployment-id="${deploymentId}" defer></script>`;

describe('maskDeploymentId', () => {
  it('hides all but the prefix and last four characters', () => {
    const masked = maskDeploymentId(snippet, deploymentId);

    expect(masked).not.toContain(deploymentId);
    expect(masked).toContain('data-deployment-id="dep_••••••••••••067b"');
    expect(masked).toContain('src="https://botdock-api.zeeshanahmed.app/widget.js"');
  });

  it('masks every occurrence', () => {
    const masked = maskDeploymentId(
      buildAndroidSnippet(`${snippet}\n${snippet}`, 'shop.example.com'),
      deploymentId,
    );
    expect(masked).not.toContain(deploymentId);
  });

  it('leaves the snippet alone when there is no deployment id', () => {
    expect(maskDeploymentId(snippet, null)).toBe(snippet);
  });
});

describe('pickPreviewHost', () => {
  it('uses the first exact, non-local domain', () => {
    expect(pickPreviewHost(['localhost:3000', '*.example.com', 'shop.example.com'])).toBe(
      'shop.example.com',
    );
  });

  it('falls back to a placeholder when only wildcards or local hosts are allowed', () => {
    expect(pickPreviewHost(['*.example.com', '127.0.0.1'])).toBe('your-site.com');
    expect(pickPreviewHost([])).toBe('your-site.com');
  });
});

describe('buildAndroidSnippet', () => {
  it('embeds the full snippet and uses the allowed domain as the WebView origin', () => {
    const android = buildAndroidSnippet(snippet, 'shop.example.com');

    expect(android).toContain(snippet);
    expect(android).toContain('loadDataWithBaseURL("https://shop.example.com"');
    expect(android).toContain('settings.javaScriptEnabled = true');
  });
});
