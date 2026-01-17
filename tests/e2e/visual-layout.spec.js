// tests/e2e/visual-layout.spec.js
import { test, expect } from '@playwright/test';

test.describe('Visual & Layout Integrity', () => {
  
  test('Mobile Simulation: Hero Banner and Product Rows scale correctly', async ({ page }) => {
    // 1. Set viewport to mobile (iPhone 12 size)
    await page.setViewportSize({ width: 390, height: 844 });
    
    console.log('Step 1: Navigate to Homepage on Mobile');
    await page.goto('/');

    // Verify Mobile Menu toggle is visible
    // Using attribute selector to avoid escaping issues with Tailwind classes
    const menuToggle = page.locator('button[class*="md:hidden"]');
    await expect(menuToggle).toBeVisible();

    // Verify Hero Banner text is visible
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    // Verify Product Rows (grid)
    const productCard = page.locator('div.bg-gray-800.rounded-lg').first();
    await expect(productCard).toBeVisible();
    
    // Check if the navbar title is visible "Vietian Fashion"
    const brand = page.getByRole('link', { name: 'Vietian Fashion' }).first();
    await expect(brand).toBeVisible();
  });

  test('Navigation: Search bar opens correctly', async ({ page }) => {
    // 1. Navigate to Homepage (Desktop)
    await page.goto('/');
    
    console.log('Step 1: Check Search Icon');
    
    // The input is hidden initially.
    const searchInput = page.getByPlaceholder('Tìm kiếm...');
    await expect(searchInput).toBeHidden();

    // Find the button that opens search.
    // It is the button in the navbar that is NOT the cart link and NOT the mobile menu.
    // We can look for the SVG path for the search icon: M21 21l-6-6...
    const searchBtn = page.locator('nav button svg path[d^="M21 21l-6-6"]').locator('..').locator('..');
    
    // Click it.
    await searchBtn.click();
    
    // Check if input appears
    await expect(page.getByPlaceholder('Tìm kiếm...')).toBeVisible();
    
    // Type something
    await page.fill('input[placeholder="Tìm kiếm..."]', 'Shirt');
    
    // Verify it stays open
    await expect(page.getByPlaceholder('Tìm kiếm...')).toBeVisible();
  });

});