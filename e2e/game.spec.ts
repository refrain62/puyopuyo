import { test, expect } from '@playwright/test';

test.describe('Puyo Puyo Game E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display mode selection buttons', async ({ page }) => {
    await expect(page.getByText('Online Battle')).toBeVisible();
    await expect(page.getByText('AI Battle')).toBeVisible();
  });

  test('should switch to AI Battle mode and display AI opponent', async ({ page }) => {
    await page.getByText('AI Battle').click();
    await expect(page.getByText('AI Opponent')).toBeVisible();
  });

  test('should allow player to move puyos in AI Battle mode', async ({ page }) => {
    await page.getByText('AI Battle').click();
    // Wait for the game to start and puyos to appear
    await page.waitForSelector('.main-game .puyo[style*="background-color"]');

    // Function to get the X position of the first visible colored puyo
    const getPuyoXPosition = async () => {
      const puyoElement = await page.locator('.main-game .puyo[style*="background-color"]').first();
      await puyoElement.waitFor({ state: 'visible' });
      // Get the offsetLeft relative to its parent (the field)
      const xPosition = await puyoElement.evaluate((el: HTMLElement) => el.offsetLeft);
      return xPosition;
    };

    const initialX = await getPuyoXPosition();
    expect(initialX).toBeGreaterThanOrEqual(0); // Ensure it's a valid position

    // Press ArrowRight key
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200); // Give time for React to re-render

    const newX = await getPuyoXPosition();
    expect(newX).toBeGreaterThan(initialX); // Expect it to move right

    // Press ArrowLeft key
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200);

    const finalX = await getPuyoXPosition();
    expect(finalX).toBeLessThan(newX); // Expect it to move left
  });

  test('should show Game Over screen in AI Battle mode', async ({ page }) => {
    test.setTimeout(120 * 1000); // Set a longer timeout for this specific test (120 seconds)
    await page.getByText('AI Battle').click();
    
    // Wait for the Game Over text to appear
    await expect(page.getByText('Game Over')).toBeVisible();
  });

  // Add more tests for online mode, specific game mechanics, etc.
});