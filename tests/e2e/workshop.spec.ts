import { expect, test } from '@playwright/test';

test.describe('ことばの工房', () => {
  test('キーワードを差し替えた言語が動き、リンクで復元できる', async ({ page, context }) => {
    await page.goto('workshop/');

    // 言語名とキーワードを差し替える
    await page.locator('.workshop-name input').fill('e2e語');
    const kwInputs = page.locator('.minilab-kw input');
    await kwInputs.nth(0).fill('もし'); // if
    await kwInputs.nth(3).fill('ことば'); // fn

    // 差し替えた文法でコードを書く
    const code = 'ことば double(x) {\n  x * 2\n}\ndouble(21)';
    await page.locator('.workshop .astviewer textarea').fill(code);
    await expect(page.locator('.minilab-value').first()).toHaveText('42');

    // リンクを作って、別タブで復元する
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: /世に出す/ }).click();
    const url = await page.locator('.workshop-url code').textContent();
    expect(url).toContain('#lang=');

    const page2 = await context.newPage();
    await page2.goto(url!);
    await expect(page2.locator('.workshop-loaded')).toContainText('e2e語');
    await expect(page2.locator('.minilab-value').first()).toHaveText('42');
  });
});
