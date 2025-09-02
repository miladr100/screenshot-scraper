import { chromium as playwrightChromium } from "playwright";
import { uploadToS3 } from '../utils/s3';
import config from '../config';

// User agents for different types of devices
const DESKTOP_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
];

const MOBILE_USER_AGENTS = [
    "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
];

// User agents for enhanced sites protected
const ENHANCED_DESKTOP_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

const ENHANCED_MOBILE_USER_AGENTS = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
];

/**
 * Check if the URL is from Braip
 */
function isBraipUrl(url: string): boolean {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.includes('braip.com') ||
            urlObj.hostname.includes('ev.braip.com') ||
            urlObj.hostname.endsWith('.braip.com');
    } catch {
        return false;
    }
}

/**
 * Check if the URL requires enhanced anti-bot protection
 */
function requiresEnhancedAntiBot(url: string): boolean {
    return isBraipUrl(url);
}

/**
 * Launch the browser with appropriate settings
 */
async function launchBrowser(enhanced = false) {
    const baseArgs = [
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
    ];

    const enhancedArgs = enhanced ? [
        ...baseArgs,
        // Core stealth
        "--disable-blink-features=AutomationControlled",
        "--disable-features=VizDisplayCompositor",
        "--exclude-switches=enable-automation",
        "--disable-extensions-except",
        "--disable-plugins-discovery",

        // Performance & behavior
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-hang-monitor",
        "--disable-ipc-flooding-protection",
        "--disable-prompt-on-repost",
        "--disable-client-side-phishing-detection",

        // Stealth headers & fingerprinting
        "--disable-component-extensions-with-background-pages",
        "--disable-default-apps",
        "--disable-features=TranslateUI,BlinkGenPropertyTrees",
        "--disable-background-mode",
        "--disable-sync",
        "--disable-translate",
        "--no-default-browser-check",
        "--no-first-run",
        "--metrics-recording-only",
        "--no-report-upload",

        // Canvas & WebGL fingerprinting
        "--disable-canvas-aa",
        "--disable-2d-canvas-clip-aa",
        "--disable-gl-drawing-for-tests",

        // Additional stealth
        "--use-mock-keychain",
        "--disable-field-trial-config",
        "--disable-features=VizDisplayCompositor,VizHitTestSurfaceLayer",
        "--run-all-compositor-stages-before-draw",
        "--disable-threaded-animation",
        "--disable-threaded-scrolling",
        "--disable-checker-imaging",

        // Network & security
        "--ignore-certificate-errors",
        "--ignore-ssl-errors",
        "--ignore-certificate-errors-spki-list",
        "--allow-running-insecure-content",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",

        // Memory & performance
        "--max_old_space_size=4096",
        "--memory-pressure-off",

        // Realistic window size
        "--window-size=1920,1080",
    ] : baseArgs;

    return playwrightChromium.launch({
        headless: true,
        args: enhancedArgs,
        slowMo: enhanced ? 100 : 0,
    })
}

/**
 * Capture screenshot of a URL
 */
async function captureScreenshot(
    url: string,
    type: "desktop" | "mobile",
    strategy: (typeof config.screenshot.loadStrategies)[number],
    timeout: number
): Promise<Buffer> {
    const isEnhanced = requiresEnhancedAntiBot(url);
    console.log(`starting browser for ${url} (enhanced: ${isEnhanced})...`);

    const browser = await launchBrowser(isEnhanced);
    console.log("browser started ...");

    console.log("starting context ...");

    // Select appropriate user agents based on the enhancement level
    const userAgents = isEnhanced ?
        (type === "mobile" ? ENHANCED_MOBILE_USER_AGENTS : ENHANCED_DESKTOP_USER_AGENTS) :
        (type === "mobile" ? MOBILE_USER_AGENTS : DESKTOP_USER_AGENTS);

    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    const contextOptions: any = {
        userAgent,
        viewport: type === "desktop" ? { width: 1920, height: 1080 } : { width: 430, height: 930 },
        extraHTTPHeaders: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "sec-ch-ua": '"Chromium";v="120", "Not A(Brand";v="99", "Google Chrome";v="120"',
            "sec-ch-ua-mobile": type === "mobile" ? "?1" : "?0",
            "sec-ch-ua-platform": type === "mobile" ? '"Android"' : '"Windows"',
            "DNT": "1",
            "X-Forwarded-For": "192.168.1." + Math.floor(Math.random() * 255),
        },
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
        bypassCSP: true,
        hasTouch: type === "mobile",
        isMobile: type === "mobile",
        deviceScaleFactor: type === "mobile" ? 2 : 1,
    };

    // Enhanced settings for Braip sites
    if (isEnhanced) {
        contextOptions.extraHTTPHeaders["Referer"] = "https://www.google.com/";
        contextOptions.locale = "en-US";
        contextOptions.timezoneId = "America/New_York";
        contextOptions.permissions = ["geolocation"];
        contextOptions.geolocation = { latitude: 40.7128, longitude: -74.0060 }; // New York
    } else {
        contextOptions.extraHTTPHeaders["Referer"] = url;
    }

    const context = await browser.newContext(contextOptions);

    // Add comprehensive stealth scripts for enhanced protection for Braip sites        
    if (isEnhanced) {
        await context.addInitScript(() => {
            // 1. Remove webdriver properties
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });

            // 2. Mock plugins realistically
            Object.defineProperty(navigator, 'plugins', {
                get: () => ({
                    length: 3,
                    0: { name: 'Chrome PDF Plugin', description: 'Portable Document Format' },
                    1: { name: 'Chrome PDF Viewer', description: 'PDF Viewer' },
                    2: { name: 'Native Client', description: 'Native Client' },
                }),
            });

            // 3. Mock languages properly
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            // 4. Mock permissions
            if (navigator.permissions) {
                navigator.permissions.query = (parameters) => {
                    return Promise.resolve({
                        state: 'granted' as PermissionState,
                        name: parameters.name,
                        onchange: null,
                        addEventListener: () => { },
                        removeEventListener: () => { },
                        dispatchEvent: () => false
                    } as PermissionStatus);
                };
            }

            // 5. Mock screen properties realistically
            Object.defineProperty(screen, 'availHeight', {
                get: () => 1040,
            });
            Object.defineProperty(screen, 'availWidth', {
                get: () => 1920,
            });
            Object.defineProperty(screen, 'colorDepth', {
                get: () => 24,
            });
            Object.defineProperty(screen, 'pixelDepth', {
                get: () => 24,
            });

            // 6. Mock chrome object completely
            (window as any).chrome = {
                runtime: {
                    onConnect: undefined,
                    onMessage: undefined,
                },
                loadTimes: function () {
                    return {
                        requestTime: Date.now() / 1000 - Math.random(),
                        startLoadTime: Date.now() / 1000 - Math.random() * 2,
                        commitLoadTime: Date.now() / 1000 - Math.random(),
                        finishDocumentLoadTime: Date.now() / 1000 - Math.random(),
                        finishLoadTime: Date.now() / 1000,
                        firstPaintTime: Date.now() / 1000 - Math.random(),
                        firstPaintAfterLoadTime: 0,
                        navigationType: 'Other',
                        wasFetchedViaSpdy: false,
                        wasNpnNegotiated: false,
                        npnNegotiatedProtocol: 'unknown',
                        wasAlternateProtocolAvailable: false,
                        connectionInfo: 'http/1.1'
                    };
                },
                csi: function () {
                    return {
                        startE: Date.now() - Math.random() * 1000,
                        onloadT: Date.now(),
                        pageT: Date.now() - Math.random() * 2000,
                        tran: 15
                    };
                },
            };

            // 7. Mock Notification permission
            Object.defineProperty(Notification, 'permission', {
                get: () => 'default',
            });

            // 8. Add realistic WebGL fingerprint
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function (parameter) {
                if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
                if (parameter === 37446) return 'Intel(R) Iris(TM) Graphics 6100'; // UNMASKED_RENDERER_WEBGL
                return getParameter.call(this, parameter);
            };

            // 9. Mock battery API
            if ((navigator as any).getBattery) {
                (navigator as any).getBattery = () => Promise.resolve({
                    charging: true,
                    chargingTime: 0,
                    dischargingTime: Infinity,
                    level: 1
                });
            }

            // 10. Add consistent Date.prototype.getTimezoneOffset
            Date.prototype.getTimezoneOffset = function () {
                return 300; // EST timezone offset
            };

            // 11. Mock canvas fingerprint consistently
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function (type?: string, quality?: number) {
                if (type === 'image/png') {
                    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
                }
                return originalToDataURL.call(this, type, quality);
            };

            // 12. Mock realistic connection
            Object.defineProperty(navigator, 'connection', {
                get: () => ({
                    effectiveType: '4g',
                    rtt: 100,
                    downlink: 10
                }),
            });

            // 13. Add proper iframe srcdoc
            const originalCreateElement = document.createElement;
            document.createElement = function (tagName: string) {
                const element = originalCreateElement.call(this, tagName);
                if (tagName === 'iframe') {
                    (element as HTMLIFrameElement).srcdoc = (element as HTMLIFrameElement).srcdoc || '';
                }
                return element;
            };

            // 14. Mock consistent Math.random for fingerprinting
            let seed = 12345;
            Math.random = function () {
                seed = (seed * 9301 + 49297) % 233280;
                return seed / 233280;
            };
        });
    }

    console.log("context started ...");

    let webpDetected = false;

    try {
        console.log("starting page ...");
        const page = await context.newPage();
        console.log("page started ...");

        console.log("checking webp ...");
        page.once("response", (res) => {
            if (res.url().includes("webp")) {
                webpDetected = true;
            }
        });
        console.log("webp checked ...");

        console.log("navigating to the url: ", url);

        // Enhanced navigation for Braip URLs
        if (isEnhanced) {
            // Pre-warm with Google first to establish session
            console.log("Enhanced mode: pre-warming session...");
            try {
                await page.goto("https://www.google.com", {
                    waitUntil: "domcontentloaded",
                    timeout: 30000
                });
                await page.waitForTimeout(1000 + Math.random() * 2000);

                // Simulate some Google activity
                await page.mouse.move(400, 300);
                await page.waitForTimeout(500);
                await page.mouse.move(600, 400);
                await page.waitForTimeout(300);
            } catch (e) {
                console.log("Pre-warming failed, continuing...");
            }
        }

        // Navigate to target URL
        await page.goto(url, { waitUntil: strategy as any, timeout });

        // Enhanced handling for Braip URLs
        if (isEnhanced) {
            console.log("Enhanced mode: checking for Cloudflare challenge...");

            // Check for Cloudflare challenge page
            const cloudflareIndicators = [
                'Verifying you are human',
                'Verify you are human',
                'Checking if the site connection is secure',
                'cloudflare',
                'cf-browser-verification',
                'challenge-form',
                'ray-id',
                'needs to review the security of your connection',
                'complete the action below',
                'verify you are human by completing'
            ];

            let isCloudflareChallenge = false;
            let challengeType = 'unknown';
            try {
                const pageContent = await page.content();
                const pageTitle = await page.title();
                const combinedContent = (pageContent + ' ' + pageTitle).toLowerCase();

                isCloudflareChallenge = cloudflareIndicators.some(indicator =>
                    combinedContent.includes(indicator.toLowerCase())
                );

                // Determine challenge type for better handling
                if (combinedContent.includes('verify you are human by completing')) {
                    challengeType = 'interactive_checkbox';
                } else if (combinedContent.includes('verifying you are human')) {
                    challengeType = 'automatic_processing';
                } else if (combinedContent.includes('checking if the site connection is secure')) {
                    challengeType = 'security_check';
                }

                console.log(`Challenge detection - Found: ${isCloudflareChallenge}, Type: ${challengeType}`);

                if (isCloudflareChallenge) {
                    console.log("Cloudflare challenge detected, attempting to handle...");

                    // Check for interactive checkbox challenge
                    try {
                        const checkboxSelectors = [
                            'input[type="checkbox"]',
                            '.cf-turnstile',
                            '#cf-challenge',
                            '[data-testid="cf-turnstile"]',
                            '.challenge-form input',
                            '.cb-lb',
                            // More specific selectors for the type shown in screenshot
                            'input[type="checkbox"][name*="cf"]',
                            'input[type="checkbox"][id*="challenge"]',
                            'label:has-text("Verify you are human") input',
                            '.challenge-stage input[type="checkbox"]',
                            '[data-ray] input[type="checkbox"]'
                        ];

                        let checkboxClicked = false;
                        for (const selector of checkboxSelectors) {
                            try {
                                const checkbox = await page.$(selector);
                                if (checkbox) {
                                    // Check if element is still attached and visible
                                    const isAttached = await checkbox.evaluate(el => el.isConnected);
                                    const isVisible = await checkbox.isVisible();

                                    if (isAttached && isVisible) {
                                        console.log(`Found interactive challenge element: ${selector}`);
                                        await page.waitForTimeout(2000); // Wait for element to be ready

                                        // Double-check element is still attached before interacting
                                        const stillAttached = await checkbox.evaluate(el => el.isConnected);
                                        if (stillAttached) {
                                            // Try to scroll the element into view first
                                            try {
                                                await checkbox.scrollIntoViewIfNeeded();
                                                await page.waitForTimeout(500);

                                                // Final check before clicking
                                                const finalCheck = await checkbox.evaluate(el =>
                                                    el.isConnected && (!(el as HTMLInputElement).disabled || true)
                                                );
                                                if (finalCheck) {
                                                    await checkbox.click();
                                                    console.log("Clicked challenge checkbox");
                                                    checkboxClicked = true;
                                                    break;
                                                }
                                            } catch (scrollError) {
                                                console.log(`Scroll/click failed for ${selector}, trying next selector`);
                                                continue;
                                            }
                                        }
                                    }
                                }
                            } catch (selectorError) {
                                console.log(`Error with selector ${selector}:`, selectorError instanceof Error ? selectorError.message : String(selectorError));
                                continue;
                            }
                        }

                        // Fallback: try to find any checkbox on challenge pages
                        if (!checkboxClicked && challengeType === 'interactive_checkbox') {
                            console.log("Trying fallback checkbox detection...");
                            try {
                                const allCheckboxes = await page.$$('input[type="checkbox"]');
                                for (const checkbox of allCheckboxes) {
                                    try {
                                        const isAttached = await checkbox.evaluate(el => el.isConnected);
                                        const isVisible = await checkbox.isVisible();

                                        if (isAttached && isVisible) {
                                            console.log("Found fallback checkbox, attempting click");

                                            // Check if still attached before scrolling
                                            const stillAttached = await checkbox.evaluate(el => el.isConnected);
                                            if (stillAttached) {
                                                try {
                                                    await checkbox.scrollIntoViewIfNeeded();
                                                    await page.waitForTimeout(500);

                                                    // Final check before clicking
                                                    const finalCheck = await checkbox.evaluate(el =>
                                                        el.isConnected && (!(el as HTMLInputElement).disabled || true)
                                                    );
                                                    if (finalCheck) {
                                                        await checkbox.click();
                                                        console.log("Successfully clicked fallback checkbox");
                                                        checkboxClicked = true;
                                                        break;
                                                    }
                                                } catch (fallbackError) {
                                                    console.log("Fallback checkbox interaction failed, trying next");
                                                    continue;
                                                }
                                            }
                                        }
                                    } catch (checkboxError) {
                                        // Continue to next checkbox if this one fails
                                        continue;
                                    }
                                }
                            } catch (fallbackError) {
                                console.log("Fallback checkbox detection failed:", fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
                            }
                        }

                        // Alternative approach: try page.click() with selectors if element handle failed
                        if (!checkboxClicked && challengeType === 'interactive_checkbox') {
                            console.log("Trying page.click() approach as final fallback...");
                            const simpleSelectors = [
                                'input[type="checkbox"]',
                                '.cf-turnstile',
                                '#cf-challenge'
                            ];

                            for (const selector of simpleSelectors) {
                                try {
                                    await page.click(selector, { timeout: 3000 });
                                    console.log(`Successfully clicked with page.click(): ${selector}`);
                                    checkboxClicked = true;
                                    break;
                                } catch (pageClickError) {
                                    // Continue to next selector
                                    continue;
                                }
                            }
                        }

                        if (checkboxClicked) {
                            // Wait longer for interactive challenge processing
                            console.log("Checkbox clicked, waiting for challenge processing...");
                            await page.waitForTimeout(8000);
                        } else {
                            // Wait for automatic challenge to resolve
                            console.log("No checkbox interaction, waiting for automatic challenge...");
                            await page.waitForTimeout(5000);
                        }
                    } catch (e) {
                        console.log("Error handling interactive challenge:", e);
                        await page.waitForTimeout(5000);
                    }

                    // Try waiting for navigation away from challenge page with multiple attempts
                    let challengeResolved = false;
                    for (let attempt = 0; attempt < 3 && !challengeResolved; attempt++) {
                        try {
                            console.log(`Waiting for challenge resolution, attempt ${attempt + 1}/3...`);
                            await page.waitForFunction(() => {
                                const content = document.body.innerText.toLowerCase();
                                const title = document.title.toLowerCase();
                                const combined = content + ' ' + title;

                                // Check if challenge is resolved
                                const hasChallenge = combined.includes('verify you are human') ||
                                    combined.includes('verifying you are human') ||
                                    combined.includes('checking if the site connection is secure') ||
                                    combined.includes('complete the action below') ||
                                    combined.includes('challenge');

                                // Also check for successful page indicators
                                const hasContent = combined.includes('braip') &&
                                    (combined.includes('produto') || combined.includes('product') ||
                                        combined.includes('comprar') || combined.includes('buy') ||
                                        combined.length > 1000); // Substantial content

                                return !hasChallenge || hasContent;
                            }, { timeout: 15000 });

                            challengeResolved = true;
                            console.log("Cloudflare challenge resolved!");
                            break;
                        } catch (e) {
                            console.log(`Challenge resolution attempt ${attempt + 1} failed, retrying...`);
                            if (attempt < 2) {
                                // Wait longer between attempts
                                await page.waitForTimeout(5000);
                            }
                        }
                    }

                    if (!challengeResolved) {
                        console.log("Challenge resolution timeout, continuing anyway...");
                    }

                    // Enhanced debugging for future improvements
                    if (!challengeResolved) {
                        try {
                            const challengeContent = await page.content();
                            const foundIndicators = cloudflareIndicators.filter(indicator =>
                                challengeContent.toLowerCase().includes(indicator.toLowerCase())
                            );
                            console.log("Challenge page indicators found:", foundIndicators);

                            // Log first 500 chars of page content for debugging
                            const contentPreview = challengeContent.substring(0, 500).replace(/\s+/g, ' ');
                            console.log("Challenge page content preview:", contentPreview);

                            // Check for any checkboxes that might have been missed
                            const checkboxCount = (challengeContent.match(/input[^>]*type=["']checkbox["']/gi) || []).length;
                            console.log("Checkboxes found on page:", checkboxCount);
                        } catch (debugError) {
                            console.log("Could not debug challenge page:", debugError instanceof Error ? debugError.message : String(debugError));
                        }
                    }
                }
            } catch (e) {
                console.log("Error checking for Cloudflare challenge:", e);
            }

            // Handle cookie banners and popups
            console.log("Enhanced mode: handling cookie banners...");
            try {
                const cookieSelectors = [
                    'button:has-text("Allow")',
                    'button:has-text("Accept")',
                    'button:has-text("OK")',
                    'button:has-text("Close")',
                    '[data-testid="cookie-accept"]',
                    '.cookie-accept',
                    '#cookie-accept',
                    'button[id*="accept"]',
                    'button[class*="accept"]'
                ];

                for (const selector of cookieSelectors) {
                    try {
                        const button = await page.$(selector);
                        if (button && await button.isVisible()) {
                            console.log(`Found and clicking cookie button: ${selector}`);
                            await button.click();
                            await page.waitForTimeout(1000);
                            break;
                        }
                    } catch (e) {
                        // Continue trying other selectors
                    }
                }
            } catch (e) {
                console.log("No cookie banner found or error handling it:", e);
            }

            // Additional wait time for enhanced mode
            console.log("Enhanced mode: additional wait time...");
            await page.waitForTimeout(3000);

            // Simulate more realistic human behavior
            console.log("Enhanced mode: simulating human behavior...");
            await page.mouse.move(200, 200);
            await page.waitForTimeout(500);
            await page.mouse.move(400, 300);
            await page.waitForTimeout(300);
            await page.mouse.move(600, 400);
            await page.waitForTimeout(200);
        }

        console.log("clicking ...");
        await page.mouse.click(100, 100);

        console.log("waiting ...");
        const waitTime = isEnhanced ?
            (webpDetected ? 3000 : 2000) :
            (webpDetected ? 1000 : 500);
        await page.waitForTimeout(waitTime);

        console.log("checking for video ...");
        try {
            const video = await page.$("video");
            if (video) {
                console.log("Video detected, activating...");

                await page.evaluate(async (vid) => {
                    try {
                        vid.muted = true;
                        await Promise.race([
                            vid.play(),
                            new Promise((_, reject) =>
                                setTimeout(() => reject("Timeout no play()"), 5000)
                            ),
                        ]);
                        await new Promise((res) => setTimeout(res, 3000));
                        vid.pause();
                    } catch (e) {
                        console.warn("Error while interacting with video", e);
                    }
                }, video);

                console.log("Video activated and paused");
            } else {
                console.log("No video detected, looking for iframe ...");

                const iframe = await page.$(
                    'iframe[src*="youtube.com"], iframe[src*="youtu.be"]'
                );
                if (iframe) {
                    console.log("YouTube iframe detected, waiting...");

                    // wait to load the thumbnail
                    await page.waitForTimeout(1000);
                }
            }
        } catch (e) {
            console.warn("Fail while processing video", e);
        }

        console.log("taking screenshot buffer ...");
        const buffer = await page.screenshot({
            type: "jpeg",
            quality: 80,
            fullPage: false,
            timeout: config.screenshot.takeScreenshotTimeout,
        });

        console.log("closing page ...");
        await page.close();

        console.log("returning screenshot buffer ...");
        return buffer;
    } catch (error) {
        console.error("error captureScreenshot: ", error);
        throw error;
    } finally {
        // 👇 This causes timeout for VSLs
        // console.log("closing context ...");
        // await context.close();

        console.log("closing context ...");
        context.removeAllListeners();

        console.log("closing browser ...");
        await browser.close();
    }
}

/**
 * Retry function with different strategies
 */
async function retry<T>(
    label: string,
    fn: (
        strategy: (typeof config.screenshot.loadStrategies)[number],
        timeout: number
    ) => Promise<T>,
    maxRetries = config.screenshot.numberOfRetries,
    enhanced = false
): Promise<T> {
    let attempt = 0;
    const timeouts = enhanced ? config.screenshot.enhancedTimeouts : config.screenshot.timeouts;
    const combinations = config.screenshot.loadStrategies.flatMap((s) =>
        timeouts.map((t) => ({ strategy: s, timeout: t }))
    );

    while (attempt < Math.min(maxRetries, combinations.length)) {
        const { strategy, timeout } = combinations[attempt];
        try {
            console.log(
                `Running ${label} - Attempt ${attempt + 1} | Strategy: ${strategy} | Timeout: ${timeout} | Enhanced: ${enhanced}`
            );
            return await fn(strategy, timeout);
        } catch (e) {
            console.warn(`${label} failed on attempt ${attempt + 1}, retrying...`, e);
            const delay = enhanced ?
                config.screenshot.delayBetweenRetries * Math.pow(2, attempt) * 1.5 :
                config.screenshot.delayBetweenRetries * Math.pow(2, attempt);
            await new Promise((r) => setTimeout(r, delay));
            attempt++;
        }
    }

    throw new Error(`Max retries reached for ${label}`);
}

/**
 * Capture and upload screenshot
 */
async function captureAndUpload(url: string, type: "desktop" | "mobile", userId: string, productId: string): Promise<string> {
    const isEnhanced = requiresEnhancedAntiBot(url);
    const buffer = await retry(`Screenshot-${type}`, (s, t) =>
        captureScreenshot(url, type, s, t), config.screenshot.numberOfRetries, isEnhanced
    );
    return retry(`UploadS3-${type}`, () =>
        uploadToS3(buffer, config.aws.s3BucketName, userId, productId), config.screenshot.numberOfRetries, false
    );
}

export {
    captureScreenshot,
    captureAndUpload,
    retry,
};
