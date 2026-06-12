import { expect, test, type Locator, type Page } from '@playwright/test';

/** CodeMirrorに確実にコードを入れる（fillは既存内容と混ざることがある） */
async function setCode(page: Page, runner: Locator, code: string) {
  const content = runner.locator('.cm-content');
  await content.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(code);
  await expect(content).toContainText(code.split('\n')[0]!.slice(0, 10));
}

test.describe('あそびば（コード実行）', () => {
  test('にわ語のエラーが誠実な日本語で返る', async ({ page }) => {
    await page.goto('playground/');
    const runner = page.locator('.runner[data-lang="niwa"]');
    await expect(runner.locator('.runner-run')).toBeEnabled();

    await setCode(page, runner, 'はな を かく');
    await runner.locator('.runner-run').click();
    await expect(runner.locator('.runner-error-message')).toContainText('はな');
  });

  test('JavaScriptの実行とconsole出力', async ({ page }) => {
    await page.goto('playground/');
    await page.getByRole('tab', { name: 'JavaScript' }).click();

    const runner = page.locator('.runner[data-lang="js"]');
    await expect(runner.locator('.runner-run')).toBeEnabled();
    await setCode(page, runner, 'console.log("niwa-e2e-ok")');
    await runner.locator('.runner-run').click();
    await expect(runner.locator('.runner-output')).toContainText('niwa-e2e-ok');
  });

  test('無限ループはタイムアウトで止まり、通知が出る', async ({ page }) => {
    await page.goto('playground/');
    await page.getByRole('tab', { name: 'JavaScript' }).click();

    const runner = page.locator('.runner[data-lang="js"]');
    await expect(runner.locator('.runner-run')).toBeEnabled();
    await setCode(page, runner, 'while (true) {}');
    await runner.locator('.runner-run').click();
    await expect(runner.locator('.runner-error-message')).toContainText('止めました', {
      timeout: 10_000,
    });

    // 殺したWorkerが作り直され、次の実行が普通に動くこと
    await expect(runner.locator('.runner-run')).toBeEnabled();
    await setCode(page, runner, 'console.log("alive-again")');
    await runner.locator('.runner-run').click();
    await expect(runner.locator('.runner-output')).toContainText('alive-again', {
      timeout: 15_000,
    });
  });
});
