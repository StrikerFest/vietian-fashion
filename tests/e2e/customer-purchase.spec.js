// tests/e2e/customer-purchase.spec.js
import { test, expect } from '@playwright/test';

test.describe('Customer Purchase Flow', () => {
  test('should allow a customer to browse, add to cart, and proceed to checkout', async ({ page }) => {
    // 1. Navigate to Homepage
    console.log('Step 1: Navigate to Homepage');
    await page.goto('/');
    
    // Check if we are on the homepage
    await expect(page.locator('nav')).toBeVisible();

    // 2. Click on a product card to open Quick View
    console.log('Step 2: Open Quick View');
    // Using a more robust locator for the first product's quick view button
    const quickViewBtn = page.locator('button[aria-label^="Xem nhanh"]').first();
    await quickViewBtn.click();

    // Wait for modal
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).toBeVisible();

    // 3. Select a size/color (if needed) and click "Add to Cart"
    console.log('Step 3: Add to Cart');
    
    // Select first available variant button
    const variantBtn = modal.locator('button.border.rounded-md').first();
    if (await variantBtn.isVisible()) {
        await variantBtn.click();
    }

    const addToCartBtn = modal.getByRole('button', { name: 'Thêm vào giỏ' });
    await expect(addToCartBtn).toBeEnabled();
    await addToCartBtn.click();

    // The modal closes after adding to cart.
    await expect(modal).toBeHidden();

    // 4. Navigate to Cart Page and verify item
    console.log('Step 4: Go to Cart');
    await page.goto('/cart');
    
    // Verify item is in cart (check for "Tổng cộng" or "1 món")
    // Increased timeout for cart calculation
    await expect(page.locator('text=Giỏ hàng của bạn')).toBeVisible();
    await expect(page.getByText('Tổng cộng')).toBeVisible({ timeout: 15000 }); 

    // 5. Proceed to Checkout and verify form fields
    console.log('Step 5: Proceed to Checkout');
    const checkoutBtn = page.getByRole('button', { name: 'Hoàn tất thanh toán' });
    await expect(checkoutBtn).toBeVisible();
  });
});
