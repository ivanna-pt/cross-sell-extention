import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';

const SLOT_COUNT = 3;

/**
 * @typedef {{url: string, altText: string | null}} Image
 * @typedef {{
 *   id: string,
 *   title: string,
 *   availableForSale: boolean,
 *   price: {amount: string, currencyCode: string},
 *   image: Image | null,
 *   product: {title: string, featuredImage: Image | null},
 * }} Variant
 * @typedef {{variantId: string, discount: number | null}} Slot
 */

export default function extension() {
  render(<Extension />, document.body);
}

function Extension() {
  const [variants, setVariants] = useState(/** @type {Variant[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(/** @type {string | null} */ (null));
  const [error, setError] = useState('');

  const settings = shopify.settings.value;
  const slots = getSlots(settings);
  const customHeading =
    typeof settings.heading === 'string' ? settings.heading.trim() : '';
  const slotIds = slots.map((slot) => slot.variantId);
  const slotKey = slotIds.join(',');

  const cartVariantIds = shopify.lines.value.map((line) => line.merchandise.id);
  const canAddCartLine = shopify.instructions.value.lines.canAddCartLine;

  useEffect(() => {
    if (!slotIds.length) {
      setVariants([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    shopify
      .query(
        `query ($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on ProductVariant {
              id
              title
              availableForSale
              price { amount currencyCode }
              image { url altText }
              product {
                title
                featuredImage { url altText }
              }
            }
          }
        }`,
        { variables: { ids: slotIds } },
      )
      .then(({ data, errors }) => {
        if (errors?.length) console.error(errors);
        const nodes =
          /** @type {{nodes?: (Variant | null)[]} | undefined} */ (data)
            ?.nodes ?? [];
        // nodes() returns null for deleted variants, {} for non-variant IDs
        setVariants(
          /** @type {Variant[]} */ (nodes.filter((node) => node?.id)),
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slotKey]);

  const offers = slots.flatMap((slot) => {
    const variant = variants.find((v) => v.id === slot.variantId);
    const isOffer =
      variant?.availableForSale && !cartVariantIds.includes(variant.id);
    return variant && isOffer ? [{ ...slot, variant }] : [];
  });

  async function handleAdd(variantId) {
    setAdding(variantId);
    setError('');
    try {
      const result = await shopify.applyCartLinesChange({
        type: 'addCartLine',
        merchandiseId: variantId,
        quantity: 1,
      });
      if (result.type === 'error') {
        setError(shopify.i18n.translate('addError'));
      }
    } catch (err) {
      console.error(err);
      setError(shopify.i18n.translate('addError'));
    } finally {
      setAdding(null);
    }
  }

  if (!slotIds.length || !canAddCartLine) {
    return null;
  }

  if (loading) {
    return <s-skeleton-paragraph></s-skeleton-paragraph>;
  }

  if (!offers.length) {
    return null;
  }

  return (
    <s-stack gap="base">
      <s-heading>
        {customHeading || shopify.i18n.translate('heading')}
      </s-heading>
      {offers.map(({ variant, discount }) => {
        const image = variant.image ?? variant.product.featuredImage;
        const variantTitle =
          variant.title && variant.title !== 'Default Title'
            ? variant.title
            : null;
        return (
          <s-grid
            key={variant.id}
            gridTemplateColumns="64px 1fr auto"
            gap="base"
            alignItems="center"
          >
            <s-product-thumbnail
              src={image?.url}
              alt={image?.altText ?? variant.product.title}
            ></s-product-thumbnail>
            <s-stack gap="small-500">
              <s-text type="strong">{variant.product.title}</s-text>
              {variantTitle && <s-text color="subdued">{variantTitle}</s-text>}
              <s-text>
                {shopify.i18n.formatCurrency(Number(variant.price.amount), {
                  currency: variant.price.currencyCode,
                })}
              </s-text>
              {discount && (
                <s-stack direction="inline" gap="small-300" alignItems="center">
                  <s-badge tone="neutral">
                    {shopify.i18n.translate('discountBadge', {
                      percent: discount,
                    })}
                  </s-badge>
                  <s-text color="subdued">
                    {shopify.i18n.translate('discountNote')}
                  </s-text>
                </s-stack>
              )}
            </s-stack>
            <s-button
              variant="secondary"
              loading={adding === variant.id}
              disabled={adding !== null}
              onClick={() => handleAdd(variant.id)}
            >
              {shopify.i18n.translate('add')}
            </s-button>
          </s-grid>
        );
      })}
      {error && <s-banner tone="critical">{error}</s-banner>}
    </s-stack>
  );
}

/**
 * Reads the offer slots configured in the checkout editor.
 * Skips empty slots and duplicate variants.
 * @param {Record<string, unknown>} settings
 * @returns {Slot[]}
 */
function getSlots(settings) {
  /** @type {Slot[]} */
  const slots = [];
  for (let i = 1; i <= SLOT_COUNT; i++) {
    const variantId = settings[`offer_${i}_variant`];
    if (typeof variantId !== 'string' || !variantId) continue;
    if (slots.some((slot) => slot.variantId === variantId)) continue;
    const discount = Number(settings[`offer_${i}_discount`]);
    slots.push({
      variantId,
      discount: discount > 0 && discount <= 100 ? Math.round(discount) : null,
    });
  }
  return slots;
}
