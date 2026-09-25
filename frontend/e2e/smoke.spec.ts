import { test, expect} from '@playwright/test';

test('landing page loads and shows create trip form', async ({page}) =>{
    await page.goto('/');
    await expect(page.getByRole('heading',{ level: 1})).toBeVisible();
});