# Touch of Gold: site & shop review

Reviewed 1 October 2026: www.togd.co.za, shop.togd.co.za and facebook.com/Touchofgolddesigning.

## The Facebook link bug (confirmed)

In the footer of www.togd.co.za the word **"Facebook" links to `https://www.facebook.com/`**, which is Facebook's homepage, not the business page. The correct URL (`facebook.com/Touchofgolddesigning/`) *is* in the code, but it wraps a few blank spaces in front of the icon, so there's nothing visible to click.

```html
<a href="https://www.facebook.com/Touchofgolddesigning/">  </a>          ← correct link, but empty
<i class="fa fa-facebook"></i> <a href="https://www.facebook.com/">Facebook</a>   ← visible, wrong
```

**Instagram has exactly the same bug.** The visible "Instagram" text goes to `instagram.com/`, not `instagram.com/touchofgolddesigningjewellers/`.

Fix: point the visible text links at the full page URLs. The new design does this.

## Main site (www.togd.co.za)

| Issue | Why it matters |
|---|---|
| Social links broken (above) | Visitors can't reach the page where the business is most active |
| SEO meta says the shop is in **New York** (`geo.placename "New York, NY"`, coordinates in Manhattan) | Hurts local search for "jeweller Witbank / eMalahleni" |
| Keywords meta still contains template leftovers: `template, onepager` | Looks unfinished to search engines |
| No meta description | Google writes its own snippet |
| Pretoria isn't mentioned anywhere, and neither is 066 509 8881 | Facebook now advertises **Witbank \| Pretoria** and that number |
| Watch repairs & batteries aren't mentioned | It's on the Facebook cover banner, so it's clearly a real service |
| Collections titled "Women 2024", "Men 2024", "Woman x 2024" | Dated, plus a typo |
| "SHop Now" button text | Typo |
| Postal code "MP1048" | eMalahleni's is 1035 (worth confirming with the client) |
| Nearly all imagery is Adobe Stock | Their own work (Facebook studio shots) is far more convincing |

## Shop (shop.togd.co.za, WordPress 7.1 + WooCommerce 11.1)

| Issue | Detail |
|---|---|
| **45 of 53 products have no category** | Only 8 rings and 3 watches are categorised, so filtering is impossible |
| Duplicate, generic product names | 13 × "Daniel Klein Watch", 7 × "Titanium Ring", 4 × "Ladies Tungsten Ring". The real model name is buried in the description |
| Spelling | "Dimond Crossover Ring"; product titles show encoding glitches on apostrophes |
| Price formatting | `R9900,00` / `R34600,00`, with no thousands separator. SA convention is `R 9 900` |
| 14 products are out of stock but still listed | They show "Read more" instead of a clear "Sold out / ask us to order" |
| Gold ring photos | Rings take up ~10% of a pale-blue frame, so the actual piece is tiny in the grid |
| Branding mismatch | The shop is a different green WordPress theme on a subdomain and feels like a different business |
| No filtering by brand, gender or price | Only a sort dropdown |

## What the redesign does about it

- Fixes the Facebook & Instagram links, adds local-business structured data (correct address) and a real meta description.
- Adds Pretoria, all three phone numbers, WhatsApp, a map and watch repairs.
- Rebuilds the catalogue from the live WooCommerce data (via its public Store API). All 53 products are re-categorised (gold & diamond / titanium & tungsten / watches, for her / him, by brand), given clean model names, SA price formatting and clear sold-out states.
- Smart-crops the gold ring photos so the piece fills the frame.
- Uses their own Facebook studio photography (sapphire cluster, solitaire, engagement shoot).

### Before going live

- **Checkout:** the new cart sends the order via WhatsApp or email. To take card payments, the next step is to keep WooCommerce as the back end and connect this front end to it: either the Store API cart/checkout endpoints, or hand off to the existing WooCommerce checkout.
- Confirm the Pretoria address, trading hours and postal code with the client.
- Facebook images were downloaded at the highest resolution Facebook serves (≈1350–1920 px). Ask the client for originals for the best quality.
