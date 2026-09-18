// The hand-built PaywallScreen (branded, with the dynamic savings callout
// and family feature list) is the paywall judges and users actually see.
// We deliberately do NOT call RevenueCatUI.presentPaywall() here: with no
// visual paywall template configured on the dashboard, it renders
// RevenueCat's generic default template instead of falling back to this
// screen, which would hide the differentiated part of the monetization
// story. Purchases, restores, and entitlement checks below all go through
// RevenueCat's core purchase APIs (react-native-purchases) directly via
// RevenueCatContext — that's the real integration, just with our own UI.
export { PaywallScreen as default } from '../src/screens/PaywallScreen';
