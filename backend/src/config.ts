/**
 * Global Backend Configuration
 *
 * Centralized config for feature flags, provider toggles,
 * and future configuration parameters.
 *
 * Provider flags control which content providers are registered
 * in the provider registry. Disabled providers will cause their
 * URLs to fall through to the generic link handler instead.
 */

export const config = {
    providers: {
        youtube:   true,
        twitter:   true,
        instagram: true,
        github:    true,
        medium:    true,
        notion:    true,
    },

    /** Future config parameters */
    // rateLimit: {
    //     windowMs: 15 * 60 * 1000,
    //     maxRequests: 100,
    // },
    // cache: {
    //     enabled: false,
    //     ttlSeconds: 300,
    // },
};
