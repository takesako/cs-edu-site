import { expect, test } from '@playwright/test';

test.describe('もようの実験室（コース3）', () => {
  test('パターンを打ちかえるとライブでハイライトが変わる', async ({ page }) => {
    await page.goto('courses/moyou/01/');
    const lab = page.locator('.regexlab').first();
    await lab.scrollIntoViewIfNeeded();

    // 初期状態: 「ねこ」が2か所
    await expect(lab.locator('.regexlab-text mark')).toHaveCount(2);

    // 「こ」1文字に書きかえると4か所（hydration完了までfillをリトライ）
    await expect(async () => {
      await lab.locator('.regexlab-pattern input').fill('こ');
      await expect(lab.locator('.regexlab-text mark')).toHaveCount(4, { timeout: 700 });
    }).toPass();

    // 壊れたもようは日本語エラー＋ヒント
    await lab.locator('.regexlab-pattern input').fill('(ねこ');
    await expect(lab.locator('.minilab-error')).toContainText('閉じられていません');
  });

  test('行ごと判定と状態機械の図が表示される', async ({ page }) => {
    // レッスン4: checkLines モード
    await page.goto('courses/moyou/04/');
    const checker = page.locator('.regexlab:has(.regexlab-lines)').first();
    await checker.scrollIntoViewIfNeeded();
    await expect(checker.locator('.regexlab-lines li.is-ok').first()).toBeVisible();
    await expect(checker.locator('.regexlab-lines li.is-ng').first()).toBeVisible();

    // レッスン6: NFAの図とステップ実行
    await page.goto('courses/moyou/06/');
    const stepLab = page.locator('.regexlab:has(.regexlab-controls)').first();
    await stepLab.scrollIntoViewIfNeeded();
    await expect(stepLab.locator('.regexlab-diagram svg')).toBeVisible();

    // 1文字すすむと、読んだ文字が点灯し、状態が動く（hydration完了までclickをリトライ）
    await expect(async () => {
      await stepLab.getByRole('button', { name: '1文字すすむ' }).click();
      await expect(stepLab.locator('.regexlab-tape .is-read')).not.toHaveCount(0, { timeout: 700 });
    }).toPass();
    await expect(stepLab.locator('.nfa-state.is-active').first()).toBeVisible();
  });
});
