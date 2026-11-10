export default function HomePage() {
  return (
    <s-page heading="Cross-sell offers">
      <s-section heading="How to set up">
        <s-ordered-list>
          <s-list-item>Go to Settings → Checkout → Customize.</s-list-item>
          <s-list-item>
            Click "Add app block" and choose cross-sell-offer.
          </s-list-item>
          <s-list-item>
            Pick up to 3 products and their discount %, then save.
          </s-list-item>
          <s-list-item>
            In Discounts, create a matching automatic discount for each product.
          </s-list-item>
        </s-ordered-list>
      </s-section>
    </s-page>
  );
}
