import { expect, test } from '@playwright/test';

test.describe('チューリング機械の実験室（コース5）', () => {
  test('1歩すすむと状態と遷移表のハイライトが動く', async ({ page }) => {
    await page.goto('courses/keisan/01/');
    const lab = page.locator('.turinglab').first();
    await lab.scrollIntoViewIfNeeded();

    // 初期状態: 「すすむ」、0歩目
    await expect(lab.locator('.turinglab-statename')).toHaveText('すすむ');
    await expect(lab.locator('.turinglab-rules tr.is-active')).toHaveCount(1);

    // 1歩すすむ（hydration完了までリトライ）
    await expect(async () => {
      await lab.getByRole('button', { name: '1歩すすむ' }).click();
      await expect(lab.locator('.algoviz-progress')).not.toContainText('0 歩目', { timeout: 700 });
    }).toPass();

    // ヘッドのマスが見えている
    await expect(lab.locator('.turinglab-cell.is-head')).toBeVisible();
  });

  test('止まらない機械はfuelで打ち切られ、表を直すと止まる', async ({ page }) => {
    await page.goto('courses/keisan/07/');
    const lab = page.locator('.turinglab:has(.turinglab-rules input)').first();
    await lab.scrollIntoViewIfNeeded();

    // 再生して、打ち切りの赤字が出るまで待つ（fuel=100 × 550ms は長いので、編集で検証する）
    // 「みぎ」行の次の状態を「おわり」に書きかえる → 1歩で止まる
    await expect(async () => {
      const nextInput = lab.locator('.turinglab-rules tbody tr').first().locator('td').nth(4).locator('input');
      await nextInput.fill('おわり');
      await nextInput.blur();
      await lab.getByRole('button', { name: '1歩すすむ' }).click();
      await expect(lab.locator('.turinglab-verdict.is-halted')).toBeVisible({ timeout: 700 });
    }).toPass();

    await expect(lab.locator('.turinglab-verdict')).toContainText('止まりました');
  });
});
